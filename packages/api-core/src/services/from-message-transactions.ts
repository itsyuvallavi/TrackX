// Owner: packages/api-core. Persists parser transactions from message flows.
import {
  getLocalDateString,
  type ParserResponse,
  type TransactionSource,
} from "@trackx/shared";
import type { TransactionRecord } from "../repositories/transactions.js";
import type { TransactionService } from "./transaction-service.js";

export async function createTransactionsFromParsed(
  transactions: TransactionService,
  rawMessage: string,
  userId: string,
  parsed: ParserResponse,
  timezone: string,
  source: TransactionSource = "telegram",
): Promise<TransactionRecord[]> {
  const created: TransactionRecord[] = [];
  const transactionDate = getLocalDateString(new Date(), timezone);

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
        source,
        rawMessage,
        transactionDate,
      }),
    );
  }

  return created;
}
