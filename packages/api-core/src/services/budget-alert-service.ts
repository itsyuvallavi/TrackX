// Owner: packages/api-core. Budget warning feedback for newly logged messages.
import { formatTelegramBudgetWarning, type CategoryName } from "@trackx/shared";
import type { TransactionRecord } from "../repositories/transactions.js";
import type { BudgetService } from "./budget-service.js";

export type BudgetAlertService = {
  warningsForTransactions(input: {
    userId: string;
    transactions: readonly TransactionRecord[];
  }): Promise<string[]>;
};

export function createBudgetAlertService(
  budgets: BudgetService,
): BudgetAlertService {
  return {
    async warningsForTransactions(input) {
      const categories = expenseCategories(input.transactions);

      if (categories.size === 0) {
        return [];
      }

      const [week, month] = await Promise.all([
        budgets.getStatus({ userId: input.userId, period: "week" }),
        budgets.getStatus({ userId: input.userId, period: "month" }),
      ]);

      return [...week.budgets, ...month.budgets]
        .filter(
          (budget) => categories.has(budget.category) && budget.status !== "ok",
        )
        .map((budget) => formatTelegramBudgetWarning(budget));
    },
  };
}

function expenseCategories(
  transactions: readonly TransactionRecord[],
): Set<CategoryName> {
  const categories = new Set<CategoryName>();

  for (const transaction of transactions) {
    if (transaction.type === "expense") {
      categories.add(transaction.category);
    }
  }

  return categories;
}
