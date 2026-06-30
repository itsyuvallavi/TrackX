// Owner: packages/api-core. Persists parser transactions from message flows.
import type { ParserResponse, TransactionSource } from "@trackx/shared";
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
        source,
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
