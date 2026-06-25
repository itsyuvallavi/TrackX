// Owner: packages/api-core. Message lifecycle event repository boundary.
import { Prisma, type PrismaClient } from "@trackx/db";

export type MessageEventStatus = "ok" | "ignored" | "failed";

export type CreateMessageEventInput = {
  correlationId: string;
  source: string;
  eventType: string;
  status: MessageEventStatus;
  userId?: string | null;
  telegramUserId?: string | null;
  telegramMessageId?: string | null;
  rawMessagePreview?: string | null;
  metadata?: unknown;
  errorMessage?: string | null;
};

export type MessageEventRecord = {
  id: string;
  correlationId: string;
  source: string;
  eventType: string;
  status: MessageEventStatus;
  createdAt: string;
};

export type MessageEventRepository = {
  create(input: CreateMessageEventInput): Promise<MessageEventRecord>;
};

export function createPrismaMessageEventRepository(
  prisma: PrismaClient,
): MessageEventRepository {
  return {
    async create(input) {
      const event = await prisma.messageEvent.create({
        data: {
          correlationId: input.correlationId,
          source: input.source,
          eventType: input.eventType,
          status: input.status,
          userId: input.userId ?? null,
          telegramUserId: input.telegramUserId ?? null,
          telegramMessageId: input.telegramMessageId ?? null,
          rawMessagePreview: input.rawMessagePreview ?? null,
          metadata:
            input.metadata === undefined || input.metadata === null
              ? Prisma.JsonNull
              : (input.metadata as Prisma.InputJsonValue),
          errorMessage: input.errorMessage ?? null,
        },
      });

      return {
        id: event.id,
        correlationId: event.correlationId,
        source: event.source,
        eventType: event.eventType,
        status: event.status,
        createdAt: event.createdAt.toISOString(),
      };
    },
  };
}
