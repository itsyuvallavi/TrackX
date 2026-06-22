// Owner: packages/shared. Short Telegram-facing text formatting helpers.
import type { BudgetStatus } from "./budget-schemas.js";
import type { CategoryName } from "./categories.js";

export function formatTelegramBudgets(
  budgets: readonly BudgetStatus[],
): string {
  if (budgets.length === 0) {
    return "No budgets yet.";
  }

  return budgets
    .slice(0, 8)
    .map(
      (budget) =>
        `${shortCategoryName(budget.category)} ${formatAmount(budget.spentAmount)}/${formatAmount(budget.limitAmount)} ${budget.currency}`,
    )
    .join("\n");
}

export function formatTelegramBudgetWarning(budget: BudgetStatus): string {
  return `Heads up: ${shortCategoryName(budget.category)} ${formatAmount(budget.spentAmount)}/${formatAmount(budget.limitAmount)} ${budget.currency} used.`;
}

function shortCategoryName(category: CategoryName): string {
  switch (category) {
    case "Restaurants / Cafes / Fun":
      return "Food & fun";
    case "Subscriptions / Tools":
      return "Subscriptions";
    default:
      return category;
  }
}

function formatAmount(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(2)));
}
