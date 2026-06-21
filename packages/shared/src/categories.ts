// Owner: packages/shared. Canonical category names and defaults for TrackX budgets.
import { z } from "zod";

export const CATEGORY_NAMES = [
  "Rent",
  "Utilities",
  "Groceries",
  "Restaurants / Cafes / Fun",
  "Transport",
  "Subscriptions / Tools",
  "Home",
  "Shopping",
  "Travel",
  "Income",
  "Misc",
] as const;

export const CategoryNameSchema = z.enum(CATEGORY_NAMES);

export type CategoryName = z.infer<typeof CategoryNameSchema>;

const CATEGORY_ALIASES: Readonly<Record<string, CategoryName>> = {
  cafe: "Restaurants / Cafes / Fun",
  cafes: "Restaurants / Cafes / Fun",
  food: "Restaurants / Cafes / Fun",
  fun: "Restaurants / Cafes / Fun",
  restaurant: "Restaurants / Cafes / Fun",
  restaurants: "Restaurants / Cafes / Fun",
  "restaurants cafes fun": "Restaurants / Cafes / Fun",
  groceries: "Groceries",
  grocery: "Groceries",
  home: "Home",
  income: "Income",
  misc: "Misc",
  rent: "Rent",
  shopping: "Shopping",
  subscriptions: "Subscriptions / Tools",
  "subscriptions tools": "Subscriptions / Tools",
  tools: "Subscriptions / Tools",
  transport: "Transport",
  travel: "Travel",
  utilities: "Utilities",
};

export function resolveCategoryName(input: string): CategoryName | null {
  const normalized = normalizeCategoryNameInput(input);
  const exact = CATEGORY_NAMES.find(
    (category) => normalizeCategoryNameInput(category) === normalized,
  );

  if (exact) {
    return exact;
  }

  return CATEGORY_ALIASES[normalized] ?? null;
}

export const CategoryKindSchema = z.enum(["expense", "income"]);

export type CategoryKind = z.infer<typeof CategoryKindSchema>;

export type DefaultBudget = {
  category: Exclude<CategoryName, "Income" | "Shopping" | "Travel">;
  monthly: number;
  weekly: number | null;
};

export const DEFAULT_BUDGETS: readonly DefaultBudget[] = [
  { category: "Rent", monthly: 1000, weekly: null },
  { category: "Utilities", monthly: 82, weekly: null },
  { category: "Subscriptions / Tools", monthly: 150, weekly: null },
  { category: "Groceries", monthly: 260, weekly: 65 },
  { category: "Restaurants / Cafes / Fun", monthly: 200, weekly: 50 },
  { category: "Transport", monthly: 75, weekly: 18 },
  { category: "Home", monthly: 75, weekly: 18 },
  { category: "Misc", monthly: 100, weekly: 25 },
];

function normalizeCategoryNameInput(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
