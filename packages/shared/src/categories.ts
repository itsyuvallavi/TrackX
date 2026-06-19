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
