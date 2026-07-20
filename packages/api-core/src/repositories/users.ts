// Owner: packages/api-core. User repository boundary for API transaction flows.
import {
  DEFAULT_LOCAL_TIMEZONE,
  DEFAULT_LOCAL_USER_EMAIL,
  DEFAULT_LOCAL_USER_ID,
  seedBudgets,
  seedCategories,
  type PrismaClient,
} from "@trackx/db";
import type { Currency } from "@trackx/shared";

export type UserRecord = {
  id: string;
  defaultCurrency: Currency;
  timezone: string;
};

export type TelegramConnectionRecord = {
  telegramUserId: string | null;
};

export type AuthProviderName = "neon" | "supabase";

export class AuthIdentityConflictError extends Error {
  constructor(email: string) {
    super(
      `An existing TrackX account for ${email} is not linked to this login.`,
    );
    this.name = "AuthIdentityConflictError";
  }
}

export type UserRepository = {
  ensureAuthUser(input: {
    provider: AuthProviderName;
    providerUserId: string;
    email: string | null;
  }): Promise<UserRecord>;
  ensureDefaultUser(): Promise<UserRecord>;
  ensureTelegramUser(telegramUserId: string): Promise<UserRecord>;
  findById(userId: string): Promise<UserRecord | null>;
  findByTelegramUserId(telegramUserId: string): Promise<UserRecord | null>;
  getTelegramConnection(
    userId: string,
  ): Promise<TelegramConnectionRecord | null>;
};

export function createPrismaUserRepository(
  prisma: PrismaClient,
): UserRepository {
  return {
    async ensureAuthUser(input) {
      const identity = await prisma.authIdentity.findUnique({
        where: {
          provider_providerUserId: {
            provider: input.provider,
            providerUserId: input.providerUserId,
          },
        },
        select: {
          id: true,
          email: true,
          user: {
            select: { id: true, defaultCurrency: true, timezone: true },
          },
        },
      });

      if (identity) {
        if (identity.email !== input.email) {
          await prisma.authIdentity.update({
            where: { id: identity.id },
            data: { email: input.email },
          });
        }

        return identity.user;
      }

      if (input.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: input.email },
          select: { id: true },
        });

        if (existingUser) {
          throw new AuthIdentityConflictError(input.email);
        }
      }

      const user = await prisma.user.create({
        data: {
          email: input.email,
          defaultCurrency: "EUR",
          timezone: DEFAULT_LOCAL_TIMEZONE,
          authIdentities: {
            create: {
              provider: input.provider,
              providerUserId: input.providerUserId,
              email: input.email,
            },
          },
        },
        select: { id: true, defaultCurrency: true, timezone: true },
      });

      await ensureDefaultSettings(user.id);

      return user;
    },

    async ensureDefaultUser() {
      const user = await prisma.user.upsert({
        where: { id: DEFAULT_LOCAL_USER_ID },
        create: {
          id: DEFAULT_LOCAL_USER_ID,
          email: DEFAULT_LOCAL_USER_EMAIL,
          defaultCurrency: "EUR",
          timezone: DEFAULT_LOCAL_TIMEZONE,
        },
        update: {
          defaultCurrency: "EUR",
          timezone: DEFAULT_LOCAL_TIMEZONE,
        },
        select: { id: true, defaultCurrency: true, timezone: true },
      });

      await ensureDefaultSettings(user.id);

      return user;
    },

    async ensureTelegramUser(telegramUserId) {
      const existing = await prisma.user.findUnique({
        where: { telegramUserId },
        select: { id: true, defaultCurrency: true, timezone: true },
      });

      if (existing) {
        await ensureDefaultSettings(existing.id);
        return existing;
      }

      const user = await prisma.user.upsert({
        where: { id: DEFAULT_LOCAL_USER_ID },
        create: {
          id: DEFAULT_LOCAL_USER_ID,
          telegramUserId,
          email: DEFAULT_LOCAL_USER_EMAIL,
          defaultCurrency: "EUR",
          timezone: DEFAULT_LOCAL_TIMEZONE,
        },
        update: {
          telegramUserId,
          defaultCurrency: "EUR",
          timezone: DEFAULT_LOCAL_TIMEZONE,
        },
        select: { id: true, defaultCurrency: true, timezone: true },
      });

      await ensureDefaultSettings(user.id);

      return user;
    },

    async findById(userId) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, defaultCurrency: true, timezone: true },
      });
    },

    async findByTelegramUserId(telegramUserId) {
      return prisma.user.findUnique({
        where: { telegramUserId },
        select: { id: true, defaultCurrency: true, timezone: true },
      });
    },

    async getTelegramConnection(userId) {
      return prisma.user.findUnique({
        where: { id: userId },
        select: { telegramUserId: true },
      });
    },
  };

  async function ensureDefaultSettings(userId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      for (const category of seedCategories) {
        await tx.category.upsert({
          where: { name: category.name },
          create: category,
          update: {
            kind: category.kind,
            isDefault: true,
          },
        });
      }

      for (const budget of seedBudgets) {
        const category = await tx.category.findUniqueOrThrow({
          where: { name: budget.category },
          select: { id: true },
        });

        await tx.budget.upsert({
          where: {
            userId_categoryId_period: {
              userId,
              categoryId: category.id,
              period: budget.period,
            },
          },
          create: {
            userId,
            categoryId: category.id,
            period: budget.period,
            limitAmount: budget.limitAmount,
            currency: budget.currency,
            isActive: true,
          },
          update: {},
        });
      }
    });
  }
}
