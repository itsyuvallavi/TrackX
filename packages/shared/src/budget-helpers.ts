// Owner: packages/shared. Pure budget calculations used by API responses and tests.
import type { CategoryName } from "./categories.js";
import type { Currency } from "./currencies.js";
import type {
  BudgetPeriod,
  BudgetStatus,
  BudgetStatusLevel,
} from "./budget-schemas.js";

export type CalculateBudgetStatusInput = {
  category: CategoryName;
  period: BudgetPeriod;
  currency: Currency;
  limitAmount: number;
  spentAmount: number;
};

export function calculateBudgetStatus(
  input: CalculateBudgetStatusInput,
): BudgetStatus {
  const remainingAmount = roundMoney(input.limitAmount - input.spentAmount);
  const percentageUsed =
    input.limitAmount === 0
      ? 0
      : roundPercentage((input.spentAmount / input.limitAmount) * 100);

  return {
    category: input.category,
    period: input.period,
    currency: input.currency,
    limitAmount: roundMoney(input.limitAmount),
    spentAmount: roundMoney(input.spentAmount),
    remainingAmount,
    percentageUsed,
    status: getBudgetStatusLevel(percentageUsed),
  };
}

export function getBudgetStatusLevel(
  percentageUsed: number,
): BudgetStatusLevel {
  if (percentageUsed > 100) {
    return "over";
  }

  if (percentageUsed >= 80) {
    return "warning";
  }

  return "ok";
}

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundPercentage(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}
