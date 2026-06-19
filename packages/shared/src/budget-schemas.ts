// Owner: packages/shared. Budget status schemas shared across API, bot, and dashboard.
import { z } from "zod";
import { CategoryNameSchema } from "./categories.js";
import { CurrencySchema } from "./currencies.js";

export const BudgetPeriodSchema = z.enum(["week", "month"]);

export const BudgetStatusLevelSchema = z.enum(["ok", "warning", "over"]);

export const BudgetStatusSchema = z.object({
  category: CategoryNameSchema,
  period: BudgetPeriodSchema,
  currency: CurrencySchema,
  limitAmount: z.number().nonnegative(),
  spentAmount: z.number().nonnegative(),
  remainingAmount: z.number(),
  percentageUsed: z.number().nonnegative(),
  status: BudgetStatusLevelSchema,
});

export const BudgetWindowSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
});

export const BudgetStatusResponseSchema = z.object({
  period: BudgetPeriodSchema,
  currency: CurrencySchema,
  window: BudgetWindowSchema,
  budgets: z.array(BudgetStatusSchema),
});

export const DashboardMonthResponseSchema = z.object({
  income: z.number(),
  expenses: z.number(),
  net: z.number(),
  currency: CurrencySchema,
  window: BudgetWindowSchema,
  budgets: z.array(BudgetStatusSchema),
});

export const DashboardWeekResponseSchema = z.object({
  expenses: z.number(),
  currency: CurrencySchema,
  window: BudgetWindowSchema,
  budgets: z.array(BudgetStatusSchema),
});

export const TelegramFeedbackSchema = z.object({
  text: z.string().min(1),
  budgetStatus: BudgetStatusSchema.nullable(),
});

export type BudgetPeriod = z.infer<typeof BudgetPeriodSchema>;
export type BudgetStatusLevel = z.infer<typeof BudgetStatusLevelSchema>;
export type BudgetStatus = z.infer<typeof BudgetStatusSchema>;
export type BudgetWindow = z.infer<typeof BudgetWindowSchema>;
export type BudgetStatusResponse = z.infer<typeof BudgetStatusResponseSchema>;
export type DashboardMonthResponse = z.infer<
  typeof DashboardMonthResponseSchema
>;
export type DashboardWeekResponse = z.infer<typeof DashboardWeekResponseSchema>;
export type TelegramFeedback = z.infer<typeof TelegramFeedbackSchema>;
