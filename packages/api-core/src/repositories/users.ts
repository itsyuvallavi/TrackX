// Owner: packages/api-core. User repository boundary for API transaction flows.
import {
  DEFAULT_LOCAL_TIMEZONE,
  DEFAULT_LOCAL_USER_EMAIL,
  DEFAULT_LOCAL_USER_ID,
  type PrismaClient,
} from "@trackx/db";
import type { Currency } from "@trackx/shared";

export type UserRecord = {
  id: string;
  defaultCurrency: Currency;
  timezone: string;
};

export type UserRepository = {
  ensureAuthUser(input: {
    authUserId: string;
    email: string | null;
  }): Promise<UserRecord>;
  ensureDefaultUser(): Promise<UserRecord>;
  ensureTelegramUser(telegramUserId: string): Promise<UserRecord>;
  findById(userId: string): Promise<UserRecord | null>;
  findByTelegramUserId(telegramUserId: string): Promise<UserRecord | null>;
};

export function createPrismaUserRepository(
  prisma: PrismaClient,
): UserRepository {
  return {
    async ensureAuthUser(input) {
      const user = await prisma.user.upsert({
        where: { id: input.authUserId },
        create: {
          id: input.authUserId,
          email: input.email,
          defaultCurrency: "EUR",
          timezone: DEFAULT_LOCAL_TIMEZONE,
        },
        update: {
          email: input.email,
          defaultCurrency: "EUR",
          timezone: DEFAULT_LOCAL_TIMEZONE,
        },
        select: { id: true, defaultCurrency: true, timezone: true },
      });

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

      return user;
    },

    async ensureTelegramUser(telegramUserId) {
      const existing = await prisma.user.findUnique({
        where: { telegramUserId },
        select: { id: true, defaultCurrency: true, timezone: true },
      });

      if (existing) {
        return existing;
      }

      return prisma.user.upsert({
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
  };
}
