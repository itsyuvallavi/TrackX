// Owner: services/api. Safe natural-language edit handling before parsing.
import type {
  CategoryName,
  Currency,
  RecentTransactionContext,
  TransactionIntentResponse,
} from "@trackx/shared";
import type { TransactionIntentClient } from "../clients/intent-client.js";
import type { TransactionRecord } from "../repositories/transactions.js";
import type { TransactionService } from "./transaction-service.js";

const INTENT_CONFIDENCE_THRESHOLD = 0.75;
const RECENT_TRANSACTION_LIMIT = 10;

export type MessageIntentInput = {
  userId: string;
  message: string;
  timezone: string;
  defaultCurrency?: Currency | undefined;
};

export type MessageIntentResult =
  | { handled: false }
  | {
      handled: true;
      transactions: TransactionRecord[];
      needsClarification: boolean;
      clarifyingQuestion: string | null;
      feedback: string;
      parser: TransactionIntentResponse["parser"];
    };

export type MessageIntentService = {
  tryHandle(input: MessageIntentInput): Promise<MessageIntentResult>;
};

export function createMessageIntentService(
  intentClient: TransactionIntentClient,
  transactions: TransactionService,
): MessageIntentService {
  return {
    async tryHandle(input) {
      const recent = await transactions.listRecent(
        input.userId,
        RECENT_TRANSACTION_LIMIT,
      );

      if (recent.length === 0) {
        return { handled: false };
      }

      const intent = await intentClient.classify({
        message: input.message,
        timezone: input.timezone,
        defaultCurrency: input.defaultCurrency,
        recentTransactions: recent.map(toRecentContext),
      });

      if (intent.action === "create_transaction") {
        return { handled: false };
      }

      if (intent.action === "update_transaction_category") {
        return updateCategoryFromIntent(
          input.userId,
          intent,
          recent,
          transactions,
        );
      }

      return clarificationResult(
        intent,
        intent.clarifyingQuestion ?? "What would you like me to change?",
      );
    },
  };
}

async function updateCategoryFromIntent(
  userId: string,
  intent: TransactionIntentResponse,
  recent: TransactionRecord[],
  transactions: TransactionService,
): Promise<MessageIntentResult> {
  const target = recent.find((record) => record.id === intent.transactionId);

  if (
    !target ||
    !intent.category ||
    intent.confidence < INTENT_CONFIDENCE_THRESHOLD
  ) {
    return clarificationResult(
      intent,
      intent.clarifyingQuestion ??
        "Which recent transaction and category should I use?",
    );
  }

  const previousCategory = target.category;
  const updated = await transactions.update(target.id, {
    userId,
    category: intent.category,
  });

  return {
    handled: true,
    transactions: [updated],
    needsClarification: false,
    clarifyingQuestion: null,
    feedback: categoryUpdateFeedback(
      target.description,
      previousCategory,
      intent.category,
    ),
    parser: intent.parser,
  };
}

function toRecentContext(
  transaction: TransactionRecord,
): RecentTransactionContext {
  return {
    id: transaction.id,
    amount: transaction.amount,
    currency: transaction.currency,
    category: transaction.category,
    description: transaction.description,
    merchant: transaction.merchant,
    source: transaction.source,
    transactionDate: transaction.transactionDate,
  };
}

function clarificationResult(
  intent: TransactionIntentResponse,
  question: string,
): MessageIntentResult {
  return {
    handled: true,
    transactions: [],
    needsClarification: true,
    clarifyingQuestion: question,
    feedback: `I need one detail: ${question}`,
    parser: intent.parser,
  };
}

function categoryUpdateFeedback(
  description: string,
  previousCategory: CategoryName,
  category: CategoryName,
): string {
  return `Updated ${description} from ${previousCategory} to ${category}.`;
}
