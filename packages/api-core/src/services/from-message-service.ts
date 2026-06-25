// Owner: packages/api-core. Natural-language message to stored transaction flow.
import { z } from "zod";
import {
  CurrencySchema,
  ParserRequestSchema,
  type ParserResponse,
} from "@trackx/shared";
import type { ParserClient } from "../clients/parser-client.js";
import type { ParseEventRepository } from "../repositories/parse-events.js";
import type {
  PendingClarificationRecord,
  PendingClarificationRepository,
  PendingClarificationScope,
} from "../repositories/pending-clarifications.js";
import type { TransactionRecord } from "../repositories/transactions.js";
import type { MessageIntentService } from "./message-intent-service.js";
import type { MessageEventService } from "./message-event-service.js";
import type { TransactionService } from "./transaction-service.js";
import type { BudgetAlertService } from "./budget-alert-service.js";
import {
  clarificationFeedback,
  successFeedback,
} from "./from-message-feedback.js";
import { createTransactionsFromParsed } from "./from-message-transactions.js";

const CLARIFICATION_TTL_MS = 30 * 60 * 1000;

export const FromMessageSchema = z.object({
  message: z.string().min(1),
  userId: z.string().uuid().optional(),
  telegramUserId: z.string().min(1).optional(),
  timezone: z.string().min(1),
  defaultCurrency: CurrencySchema.optional(),
  correlationId: z.string().min(1).optional(),
});

export type FromMessageInput = z.infer<typeof FromMessageSchema>;

export type FromMessageResponse = {
  transactions: TransactionRecord[];
  needsClarification: boolean;
  clarifyingQuestion: string | null;
  feedback: string;
  parser: ParserResponse["parser"] | null;
};

export type FromMessageService = {
  createFromMessage(input: FromMessageInput): Promise<FromMessageResponse>;
};

export function createFromMessageService(
  parser: ParserClient,
  parseEvents: ParseEventRepository,
  pendingClarifications: PendingClarificationRepository,
  transactions: TransactionService,
  messageIntents?: MessageIntentService,
  budgetAlerts?: BudgetAlertService,
  messageEvents?: MessageEventService,
): FromMessageService {
  return {
    async createFromMessage(input) {
      const flowStartedAt = Date.now();
      const resolveStartedAt = Date.now();
      const userId = await transactions.resolveMessageUser({
        userId: input.userId,
        telegramUserId: input.telegramUserId,
      });
      await messageEvents?.record({
        correlationId: input.correlationId,
        source: "api",
        eventType: "message_user_resolved",
        userId,
        telegramUserId: input.telegramUserId,
        rawMessage: input.message,
        metadata: {
          elapsedMs: elapsedSince(flowStartedAt),
          userResolveDurationMs: elapsedSince(resolveStartedAt),
        },
      });
      const scope = clarificationScope(userId, input.telegramUserId);
      const pendingLookupStartedAt = Date.now();
      const pending = await pendingClarifications.findActive(scope);
      const pendingLookupDurationMs = elapsedSince(pendingLookupStartedAt);
      const parserMessage = pending
        ? combineClarification(pending, input.message)
        : input.message;
      const rawMessage = pending?.originalMessage ?? input.message;
      let intentDurationMs: number | undefined;

      if (!pending && messageIntents) {
        const intentStartedAt = Date.now();
        const intentResult = await tryHandleIntent(messageIntents, {
          userId,
          message: input.message,
          timezone: input.timezone,
          defaultCurrency: input.defaultCurrency,
        });
        intentDurationMs = elapsedSince(intentStartedAt);

        if (intentResult.handled) {
          return intentResult;
        }
      }

      const parserRequest = ParserRequestSchema.parse({
        message: parserMessage,
        timezone: input.timezone,
        defaultCurrency: input.defaultCurrency,
      });
      await messageEvents?.record({
        correlationId: input.correlationId,
        source: "api",
        eventType: "parser_started",
        userId,
        telegramUserId: input.telegramUserId,
        rawMessage: rawMessage,
        metadata: compactMetadata({
          elapsedMs: elapsedSince(flowStartedAt),
          pendingLookupDurationMs,
          intentDurationMs,
        }),
      });

      try {
        const parserStartedAt = Date.now();
        const parsed = await parser.parseTransaction(parserRequest);
        const parserDurationMs = elapsedSince(parserStartedAt);

        if (parsed.needsClarification) {
          const clarificationWriteStartedAt = Date.now();
          await pendingClarifications.saveActive({
            ...scope,
            originalMessage: rawMessage,
            clarifyingQuestion: parsed.clarifyingQuestion,
            expiresAt: new Date(Date.now() + CLARIFICATION_TTL_MS),
          });

          await parseEvents.create({
            userId,
            rawMessage: parserMessage,
            parserResponse: parsed,
            status: "clarification",
          });
          await messageEvents?.record({
            correlationId: input.correlationId,
            source: "api",
            eventType: "parser_clarification",
            userId,
            telegramUserId: input.telegramUserId,
            rawMessage: rawMessage,
            metadata: {
              elapsedMs: elapsedSince(flowStartedAt),
              parser: parsed.parser,
              parserDurationMs,
              clarificationWriteDurationMs: elapsedSince(
                clarificationWriteStartedAt,
              ),
            },
          });

          return {
            transactions: [],
            needsClarification: true,
            clarifyingQuestion: parsed.clarifyingQuestion,
            feedback: clarificationFeedback(parsed),
            parser: parsed.parser,
          };
        }

        const dbWriteStartedAt = Date.now();
        const created = await createTransactionsFromParsed(
          transactions,
          rawMessage,
          userId,
          parsed,
          input.timezone,
        );
        const dbWriteDurationMs = elapsedSince(dbWriteStartedAt);

        const cleanupStartedAt = Date.now();
        await pendingClarifications.resolveActive(scope);

        await parseEvents.create({
          userId,
          rawMessage: parserMessage,
          parserResponse: parsed,
          status: "success",
        });
        const cleanupDurationMs = elapsedSince(cleanupStartedAt);
        const feedbackStartedAt = Date.now();
        const feedback = await successFeedback(created, userId, budgetAlerts);
        const feedbackDurationMs = elapsedSince(feedbackStartedAt);
        await messageEvents?.record({
          correlationId: input.correlationId,
          source: "api",
          eventType: "transactions_created",
          userId,
          telegramUserId: input.telegramUserId,
          rawMessage: rawMessage,
          metadata: {
            elapsedMs: elapsedSince(flowStartedAt),
            parser: parsed.parser,
            parserDurationMs,
            dbWriteDurationMs,
            cleanupDurationMs,
            feedbackDurationMs,
            transactionCount: created.length,
          },
        });

        return {
          transactions: created,
          needsClarification: false,
          clarifyingQuestion: null,
          feedback,
          parser: parsed.parser,
        };
      } catch (error) {
        await parseEvents.create({
          userId,
          rawMessage: parserMessage,
          parserResponse: {
            error:
              error instanceof Error ? error.message : "Unknown parser error.",
          },
          status: "failure",
        });
        await messageEvents?.record({
          correlationId: input.correlationId,
          source: "api",
          eventType: "parser_failed",
          status: "failed",
          userId,
          telegramUserId: input.telegramUserId,
          rawMessage: rawMessage,
          metadata: { elapsedMs: elapsedSince(flowStartedAt) },
          error,
        });

        throw error;
      }
    },
  };
}

async function tryHandleIntent(
  messageIntents: MessageIntentService,
  input: Parameters<MessageIntentService["tryHandle"]>[0],
) {
  try {
    return await messageIntents.tryHandle(input);
  } catch {
    return { handled: false } as const;
  }
}

function clarificationScope(
  userId: string,
  telegramUserId: string | undefined,
): PendingClarificationScope {
  return {
    userId,
    telegramUserId: telegramUserId ?? null,
  };
}

function combineClarification(
  pending: PendingClarificationRecord,
  answer: string,
): string {
  return `Original message: ${pending.originalMessage}. Clarification answer: ${answer}.`;
}

function elapsedSince(startedAt: number): number {
  return Date.now() - startedAt;
}

function compactMetadata(
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  );
}
