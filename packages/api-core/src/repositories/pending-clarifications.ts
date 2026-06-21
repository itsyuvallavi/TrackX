// Owner: packages/api-core. Pending clarification repository for durable parser follow-ups.
import type { PrismaClient } from "@trackx/db";

export type PendingClarificationRecord = {
  id: string;
  userId: string;
  telegramUserId: string | null;
  originalMessage: string;
  clarifyingQuestion: string | null;
  status: "active" | "resolved";
  expiresAt: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PendingClarificationScope = {
  userId: string;
  telegramUserId?: string | null;
};

export type SavePendingClarificationInput = PendingClarificationScope & {
  originalMessage: string;
  clarifyingQuestion: string | null;
  expiresAt: Date;
};

export type PendingClarificationRepository = {
  findActive(
    scope: PendingClarificationScope,
  ): Promise<PendingClarificationRecord | null>;
  resolveActive(scope: PendingClarificationScope): Promise<void>;
  saveActive(input: SavePendingClarificationInput): Promise<void>;
};

export function createPrismaPendingClarificationRepository(
  prisma: PrismaClient,
): PendingClarificationRepository {
  async function resolveActive(
    scope: PendingClarificationScope,
  ): Promise<void> {
    await prisma.pendingClarification.updateMany({
      where: {
        ...scopeWhere(scope),
        status: "active",
      },
      data: {
        status: "resolved",
        resolvedAt: new Date(),
      },
    });
  }

  return {
    async findActive(scope) {
      const record = await prisma.pendingClarification.findFirst({
        where: {
          ...scopeWhere(scope),
          status: "active",
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: "desc" },
      });

      return record ? mapPendingClarification(record) : null;
    },

    resolveActive,

    async saveActive(input) {
      await resolveActive(input);
      await prisma.pendingClarification.create({
        data: {
          userId: input.userId,
          telegramUserId: input.telegramUserId ?? null,
          originalMessage: input.originalMessage,
          clarifyingQuestion: input.clarifyingQuestion,
          expiresAt: input.expiresAt,
        },
      });
    },
  };
}

function scopeWhere(scope: PendingClarificationScope): {
  userId: string;
  telegramUserId: string | null;
} {
  return {
    userId: scope.userId,
    telegramUserId: scope.telegramUserId ?? null,
  };
}

type PendingClarificationRow = {
  id: string;
  userId: string;
  telegramUserId: string | null;
  originalMessage: string;
  clarifyingQuestion: string | null;
  status: "active" | "resolved";
  expiresAt: Date;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function mapPendingClarification(
  row: PendingClarificationRow,
): PendingClarificationRecord {
  return {
    id: row.id,
    userId: row.userId,
    telegramUserId: row.telegramUserId,
    originalMessage: row.originalMessage,
    clarifyingQuestion: row.clarifyingQuestion,
    status: row.status,
    expiresAt: row.expiresAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
