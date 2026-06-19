// Owner: services/api. Parse event repository boundary and Prisma implementation.
import type { ParserResponse } from "@trackx/shared";
import type { PrismaClient } from "@trackx/db";

export type ParseEventStatus = "success" | "clarification" | "failure";

export type CreateParseEventInput = {
  userId: string;
  rawMessage: string;
  parserResponse: ParserResponse | { error: string };
  status: ParseEventStatus;
};

export type ParseEventRecord = {
  id: string;
  userId: string;
  rawMessage: string;
  status: ParseEventStatus;
  createdAt: string;
};

export type ParseEventRepository = {
  create(input: CreateParseEventInput): Promise<ParseEventRecord>;
};

export function createPrismaParseEventRepository(
  prisma: PrismaClient,
): ParseEventRepository {
  return {
    async create(input) {
      const event = await prisma.parseEvent.create({
        data: {
          userId: input.userId,
          rawMessage: input.rawMessage,
          parserResponse: input.parserResponse,
          status: input.status,
        },
      });

      return {
        id: event.id,
        userId: event.userId,
        rawMessage: event.rawMessage,
        status: event.status,
        createdAt: event.createdAt.toISOString(),
      };
    },
  };
}
