// Owner: apps/web. Utility helpers for editable budget lab planning.
import type {
  BudgetLimitUpsert,
  BudgetPeriod,
  CategoryName,
} from "@trackx/shared";
import type { BudgetRecord } from "@/lib/api";

export type MoneyRow = {
  category?: CategoryName;
  id: string;
  label: string;
  amount: number;
};

export const FIXED_ROWS: Array<{
  category: CategoryName;
  id: string;
  label: string;
}> = [
  { category: "Rent", id: "rent", label: "Rent" },
  { category: "Utilities", id: "utilities", label: "Utilities" },
  {
    category: "Subscriptions / Tools",
    id: "subscriptions",
    label: "Subscriptions",
  },
];

export const FLEX_ROWS: Array<{
  category: CategoryName;
  id: string;
  label: string;
}> = [
  { category: "Groceries", id: "groceries", label: "Groceries" },
  { category: "Restaurants / Cafes / Fun", id: "food", label: "Food & fun" },
  { category: "Transport", id: "transport", label: "Transport" },
  { category: "Home", id: "home", label: "Home" },
  { category: "Misc", id: "misc", label: "Misc" },
];

const EXTRA_FLEX_ROWS: Array<{
  category: CategoryName;
  id: string;
  label: string;
}> = [
  { category: "Shopping", id: "shopping", label: "Shopping" },
  { category: "Travel", id: "travel", label: "Travel" },
];

const BUDGET_CATEGORIES: CategoryName[] = [
  ...FIXED_ROWS.map((row) => row.category),
  ...FLEX_ROWS.map((row) => row.category),
  ...EXTRA_FLEX_ROWS.map((row) => row.category),
];

export function updateRows(
  rows: MoneyRow[],
  id: string,
  amount: number,
): MoneyRow[] {
  return rows.map((row) => (row.id === id ? { ...row, amount } : row));
}

export function sumRows(rows: MoneyRow[]): number {
  return rows.reduce((total, row) => total + row.amount, 0);
}

export function roundToFive(value: number): number {
  return Math.round(value / 5) * 5;
}

export function percentOf(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min((value / total) * 100, 100));
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function buildInitialRows(initialBudgets: BudgetRecord[]) {
  const monthly = new Map(
    initialBudgets
      .filter((budget) => budget.period === "month")
      .map((budget) => [budget.category, budget]),
  );
  const fixedRows = FIXED_ROWS.map(({ category, id, label }) => ({
    category,
    id,
    label,
    amount: monthly.get(category)?.limitAmount ?? 0,
  }));
  const flexRows = [...FLEX_ROWS, ...activeExtraFlexRows(monthly)].map(
    ({ category, id, label }) => ({
      category,
      id,
      label,
      amount: monthly.get(category)?.limitAmount ?? 0,
    }),
  );
  const monthlyPot = Math.max(sumRows(fixedRows) + sumRows(flexRows), 2000);

  return {
    fixedRows,
    flexRows,
    monthlyPot,
    signature: signatureForRows(fixedRows, flexRows),
  };
}

function activeExtraFlexRows(
  monthly: Map<CategoryName, BudgetRecord>,
): typeof EXTRA_FLEX_ROWS {
  return EXTRA_FLEX_ROWS.filter(
    ({ category }) => (monthly.get(category)?.limitAmount ?? 0) > 0,
  );
}

export function getNextFlexRow(rows: MoneyRow[]): MoneyRow {
  const existingCategories = new Set(rows.map((row) => categoryForRow(row)));
  const nextCategory = EXTRA_FLEX_ROWS.find(
    (row) => !existingCategories.has(row.category),
  );

  return nextCategory
    ? { ...nextCategory, amount: 0 }
    : {
        category: "Misc",
        id: crypto.randomUUID(),
        label: `Other ${rows.length + 1}`,
        amount: 0,
      };
}

export function categoryForRow(row: MoneyRow): CategoryName {
  if (row.category) {
    return row.category;
  }

  const fixed = FIXED_ROWS.find((candidate) => candidate.id === row.id);
  const flex = FLEX_ROWS.find((candidate) => candidate.id === row.id);
  const extraFlex = EXTRA_FLEX_ROWS.find(
    (candidate) => candidate.id === row.id,
  );

  return (
    fixed?.category ??
    flex?.category ??
    extraFlex?.category ??
    labelToCategory(row.label)
  );
}

export function signatureForRows(
  fixedRows: MoneyRow[],
  flexRows: MoneyRow[],
): string {
  return toMonthlyBudgetPayloadRows(fixedRows, flexRows)
    .map((row) => `${row.period}:${row.category}:${row.limitAmount}`)
    .join("|");
}

export function toMonthlyBudgetPayloadRows(
  fixedRows: MoneyRow[],
  flexRows: MoneyRow[],
): BudgetLimitUpsert["budgets"] {
  const byCategory = amountsByCategory([...fixedRows, ...flexRows]);

  return completeBudgetRows("month", byCategory);
}

export function toWeeklyBudgetPayloadRows(
  flexRows: MoneyRow[],
): BudgetLimitUpsert["budgets"] {
  const byCategory = amountsByCategory(flexRows);

  return completeBudgetRows("week", byCategory, toWeeklyLimit);
}

function amountsByCategory(rows: MoneyRow[]): Map<CategoryName, number> {
  return rows.reduce((byCategory, row) => {
    const category = categoryForRow(row);
    byCategory.set(category, (byCategory.get(category) ?? 0) + row.amount);
    return byCategory;
  }, new Map<CategoryName, number>());
}

function completeBudgetRows(
  period: BudgetPeriod,
  byCategory: Map<CategoryName, number>,
  transformAmount: (amount: number) => number = (amount) => amount,
): BudgetLimitUpsert["budgets"] {
  return BUDGET_CATEGORIES.map((category) => ({
    category,
    period,
    limitAmount: transformAmount(byCategory.get(category) ?? 0),
    currency: "EUR" as const,
  }));
}

function toWeeklyLimit(monthlyLimit: number): number {
  return Math.floor(monthlyLimit / 4);
}

function labelToCategory(label: string): CategoryName {
  const normalized = label.trim().toLowerCase();

  if (normalized.includes("rent")) {
    return "Rent";
  }

  if (normalized.includes("util")) {
    return "Utilities";
  }

  if (normalized.includes("sub")) {
    return "Subscriptions / Tools";
  }

  return "Misc";
}
