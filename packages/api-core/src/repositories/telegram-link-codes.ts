// Owner: packages/api-core. Telegram link-code repository boundary.
import type { PrismaClient } from "@trackx/db";

export type TelegramLinkCodeRecord = {
  id: string;
  userId: string;
  codeHash: string;
  expiresAt: Date;
  consumedAt: Date | null;
  telegramUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TelegramLinkConsumeResult =
  | {
      status: "linked";
      userId: string;
      telegramUserId: string;
    }
  | { status: "invalid_code" }
  | { status: "telegram_already_linked" };

export type TelegramLinkCodeRepository = {
  create(input: {
    userId: string;
    codeHash: string;
    expiresAt: Date;
  }): Promise<TelegramLinkCodeRecord>;
  expireActiveForUser(userId: string, consumedAt: Date): Promise<void>;
  consumeAndLink(input: {
    codeHash: string;
    telegramUserId: string;
    consumedAt: Date;
  }): Promise<TelegramLinkConsumeResult>;
};

export function createPrismaTelegramLinkCodeRepository(
  prisma: PrismaClient,
): TelegramLinkCodeRepository {
  return {
    async create(input) {
      return prisma.telegramLinkCode.create({
        data: input,
      });
    },

    async expireActiveForUser(userId, consumedAt) {
      await prisma.telegramLinkCode.updateMany({
        where: {
          userId,
          consumedAt: null,
          expiresAt: { gt: consumedAt },
        },
        data: { consumedAt },
      });
    },

    async consumeAndLink(input) {
      return prisma.$transaction(async (tx) => {
        const linkCode = await tx.telegramLinkCode.findFirst({
          where: {
            codeHash: input.codeHash,
            consumedAt: null,
            expiresAt: { gt: input.consumedAt },
          },
          select: {
            id: true,
            userId: true,
          },
        });

        if (!linkCode) {
          return { status: "invalid_code" };
        }

        const existing = await tx.user.findUnique({
          where: { telegramUserId: input.telegramUserId },
          select: { id: true },
        });

        if (existing && existing.id !== linkCode.userId) {
          return { status: "telegram_already_linked" };
        }

        await tx.user.update({
          where: { id: linkCode.userId },
          data: { telegramUserId: input.telegramUserId },
        });

        await tx.telegramLinkCode.update({
          where: { id: linkCode.id },
          data: {
            consumedAt: input.consumedAt,
            telegramUserId: input.telegramUserId,
          },
        });

        return {
          status: "linked",
          userId: linkCode.userId,
          telegramUserId: input.telegramUserId,
        };
      });
    },
  };
}
