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
import type {
  TransactionRecord,
  TransactionRepository,
} from "../repositories/transactions.js";
import type { MessageIntentService } from "./message-intent-service.js";
import type { TransactionService } from "./transaction-service.js";
import type { BudgetAlertService } from "./budget-alert-service.js";

const CLARIFICATION_TTL_MS = 30 * 60 * 1000;

export const FromMessageSchema = z.object({
  message: z.string().min(1),
  userId: z.string().uuid().optional(),
  telegramUserId: z.string().min(1).optional(),
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
  pendingClarifications: PendingClarificationRepository,
  transactions: TransactionService,
  messageIntents?: MessageIntentService,
  budgetAlerts?: BudgetAlertService,
): FromMessageService {
  return {
    async createFromMessage(input) {
      const userId = await transactions.resolveMessageUser({
        userId: input.userId,
        telegramUserId: input.telegramUserId,
      });
      const scope = clarificationScope(userId, input.telegramUserId);
      const pending = await pendingClarifications.findActive(scope);
      const parserMessage = pending
        ? combineClarification(pending, input.message)
        : input.message;
      const rawMessage = pending?.originalMessage ?? input.message;

      if (!pending && messageIntents) {
        const intentResult = await tryHandleIntent(messageIntents, {
          userId,
          message: input.message,
          timezone: input.timezone,
          defaultCurrency: input.defaultCurrency,
        });

        if (intentResult.handled) {
          return intentResult;
        }
      }

      const parserRequest = ParserRequestSchema.parse({
        message: parserMessage,
        timezone: input.timezone,
        defaultCurrency: input.defaultCurrency,
      });

      try {
        const parsed = await parser.parseTransaction(parserRequest);

        if (parsed.needsClarification) {
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
          rawMessage,
          userId,
          parsed,
          input.timezone,
        );

        await pendingClarifications.resolveActive(scope);

        await parseEvents.create({
          userId,
          rawMessage: parserMessage,
          parserResponse: parsed,
          status: "success",
        });

        return {
          transactions: created,
          needsClarification: false,
          clarifyingQuestion: null,
          feedback: await successFeedback(created, userId, budgetAlerts),
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

async function successFeedback(
  transactions: TransactionRecord[],
  userId: string,
  budgetAlerts: BudgetAlertService | undefined,
): Promise<string> {
  if (transactions.length === 0) {
    return "No transactions were created.";
  }

  if (transactions.length === 1) {
    const [transaction] = transactions;
    if (!transaction) {
      return "No transactions were created.";
    }

    return appendBudgetWarnings(
      `Logged ${formatLoggedAmount(transaction)} for ${transaction.category}.`,
      await budgetWarnings(budgetAlerts, userId, transactions),
    );
  }

  const total = transactions.reduce((sum, transaction) => {
    if (transaction.type === "income") {
      return sum;
    }

    return sum + displayAmount(transaction).amount;
  }, 0);
  const currency = displayAmount(transactions[0]).currency;

  return appendBudgetWarnings(
    `Logged ${transactions.length} transactions totaling ${total} ${currency}.`,
    await budgetWarnings(budgetAlerts, userId, transactions),
  );
}

async function budgetWarnings(
  budgetAlerts: BudgetAlertService | undefined,
  userId: string,
  transactions: TransactionRecord[],
): Promise<string[]> {
  if (!budgetAlerts) {
    return [];
  }

  return budgetAlerts.warningsForTransactions({ userId, transactions });
}

function appendBudgetWarnings(feedback: string, warnings: string[]): string {
  if (warnings.length === 0) {
    return feedback;
  }

  return [feedback, ...warnings].join("\n");
}

function formatLoggedAmount(transaction: TransactionRecord): string {
  const display = displayAmount(transaction);

  if (
    display.currency === transaction.currency &&
    display.amount === transaction.amount
  ) {
    return `${display.amount} ${display.currency}`;
  }

  return `${display.amount} ${display.currency} (${transaction.amount} ${transaction.currency})`;
}

function displayAmount(transaction: TransactionRecord | undefined): {
  amount: number;
  currency: TransactionRecord["currency"];
} {
  if (!transaction) {
    return { amount: 0, currency: "EUR" };
  }

  if (transaction.currency !== "EUR" && transaction.amountEur !== null) {
    return { amount: transaction.amountEur, currency: "EUR" };
  }

  return { amount: transaction.amount, currency: transaction.currency };
}
