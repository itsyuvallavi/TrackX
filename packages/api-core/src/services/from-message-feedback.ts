// Owner: packages/api-core. Feedback text helpers for message-created transactions.
import type { ParserResponse } from "@trackx/shared";
import type { TransactionRecord } from "../repositories/transactions.js";
import type { BudgetAlertService } from "./budget-alert-service.js";

export function clarificationFeedback(parsed: ParserResponse): string {
  return `I need one detail: ${parsed.clarifyingQuestion ?? "Can you clarify?"}`;
}

export async function successFeedback(
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
