// Owner: services/api. Natural-language message to stored transaction flow.
import { z } from "zod";
import {
  CurrencySchema,
  ParserRequestSchema,
  type ParserResponse,
} from "@trackx/shared";
import type { ParserClient } from "../clients/parser-client.js";
import type { ParseEventRepository } from "../repositories/parse-events.js";
import type {
  TransactionRecord,
  TransactionRepository,
} from "../repositories/transactions.js";
import type { TransactionService } from "./transaction-service.js";

export const FromMessageSchema = z.object({
  message: z.string().min(1),
  userId: z.string().uuid().optional(),
  timezone: z.string().min(1),
  defaultCurrency: CurrencySchema.optional(),
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
  transactions: TransactionService,
): FromMessageService {
  return {
    async createFromMessage(input) {
      const userId = await transactions.resolveUser(input.userId);
      const parserRequest = ParserRequestSchema.parse({
        message: input.message,
        timezone: input.timezone,
        defaultCurrency: input.defaultCurrency,
      });

      try {
        const parsed = await parser.parseTransaction(parserRequest);

        if (parsed.needsClarification) {
          await parseEvents.create({
            userId,
            rawMessage: input.message,
            parserResponse: parsed,
            status: "clarification",
          });

          return {
            transactions: [],
            needsClarification: true,
            clarifyingQuestion: parsed.clarifyingQuestion,
            feedback: clarificationFeedback(parsed),
            parser: parsed.parser,
          };
        }

        const created = await createTransactionsFromParsed(
          transactions,
          input.message,
          userId,
          parsed,
          input.timezone,
        );

        await parseEvents.create({
          userId,
          rawMessage: input.message,
          parserResponse: parsed,
          status: "success",
        });

        return {
          transactions: created,
          needsClarification: false,
          clarifyingQuestion: null,
          feedback: successFeedback(created),
          parser: parsed.parser,
        };
      } catch (error) {
        await parseEvents.create({
          userId,
          rawMessage: input.message,
          parserResponse: {
            error:
              error instanceof Error ? error.message : "Unknown parser error.",
          },
          status: "failure",
        });

        throw error;
      }
    },
  };
}

async function createTransactionsFromParsed(
  transactions: TransactionService,
  rawMessage: string,
  userId: string,
  parsed: ParserResponse,
  timezone: string,
): Promise<TransactionRecord[]> {
  const created: TransactionRecord[] = [];
  const transactionDate = localDay(new Date(), timezone);

  for (const transaction of parsed.transactions) {
    created.push(
      await transactions.create({
        userId,
        type: transaction.type,
        amount: transaction.amount,
        currency: transaction.currency,
        category: transaction.category,
        description: transaction.description,
        merchant: transaction.merchant ?? null,
        source: "telegram",
        rawMessage,
        transactionDate,
      }),
    );
  }

  return created;
}

function localDay(date: Date, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function clarificationFeedback(parsed: ParserResponse): string {
  return `I need one detail: ${parsed.clarifyingQuestion ?? "Can you clarify?"}`;
}

function successFeedback(transactions: TransactionRecord[]): string {
  if (transactions.length === 0) {
    return "No transactions were created.";
  }

  if (transactions.length === 1) {
    const [transaction] = transactions;
    if (!transaction) {
      return "No transactions were created.";
    }

    return `Logged ${transaction.amount} ${transaction.currency} for ${transaction.category}.`;
  }

  const total = transactions.reduce((sum, transaction) => {
    if (transaction.type === "income") {
      return sum;
    }

    return sum + transaction.amount;
  }, 0);
  const currency = transactions[0]?.currency ?? "EUR";

  return `Logged ${transactions.length} transactions totaling ${total} ${currency}.`;
}
