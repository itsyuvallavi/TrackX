// Owner: services/api. Budget status and dashboard summary orchestration.
import { z } from "zod";
import {
  BudgetPeriodSchema,
  calculateBudgetStatus,
  getPeriodWindow,
  roundMoney,
  type BudgetPeriod,
  type BudgetStatusResponse,
  type BudgetWindow,
  type DashboardMonthResponse,
  type DashboardWeekResponse,
} from "@trackx/shared";
import type { UserRepository } from "../repositories/users.js";
import type {
  BudgetRecord,
  BudgetRepository,
} from "../repositories/budgets.js";
import { ApiNotFoundError } from "./transaction-service.js";

export const BudgetStatusQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  period: BudgetPeriodSchema.default("month"),
});

export const BudgetListQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  period: BudgetPeriodSchema.optional(),
});

export type BudgetStatusQuery = z.infer<typeof BudgetStatusQuerySchema>;
export type BudgetListQuery = z.infer<typeof BudgetListQuerySchema>;

export type BudgetService = {
  list(input: BudgetListQuery): Promise<BudgetRecord[]>;
  getStatus(input: BudgetStatusQuery): Promise<BudgetStatusResponse>;
  getWeekDashboard(userId?: string): Promise<DashboardWeekResponse>;
  getMonthDashboard(userId?: string): Promise<DashboardMonthResponse>;
};

type PeriodContext = {
  user: Awaited<ReturnType<UserRepository["ensureDefaultUser"]>>;
  window: BudgetWindow;
  totals: Awaited<ReturnType<BudgetRepository["getTransactionTotals"]>>;
};

export function createBudgetService(
  users: UserRepository,
  budgets: BudgetRepository,
  now: () => Date = () => new Date(),
): BudgetService {
  async function resolveUser(userId?: string) {
    if (!userId) {
      return users.ensureDefaultUser();
    }

    const user = await users.findById(userId);

    if (!user) {
      throw new ApiNotFoundError("User not found.");
    }

    return user;
  }

  async function loadPeriodContext(
    userId: string | undefined,
    period: BudgetPeriod,
  ): Promise<PeriodContext> {
    const user = await resolveUser(userId);
    const periodWindow = getPeriodWindow(now(), period, user.timezone);
    const totals = await budgets.getTransactionTotals({
      userId: user.id,
      currency: user.defaultCurrency,
      start: periodWindow.start,
      end: periodWindow.end,
    });

    return {
      user,
      window: {
        start: periodWindow.start.toISOString(),
        end: periodWindow.end.toISOString(),
      },
      totals,
    };
  }

  async function statusForPeriod(
    userId: string | undefined,
    period: BudgetPeriod,
  ): Promise<BudgetStatusResponse> {
    const context = await loadPeriodContext(userId, period);
    const activeBudgets = await budgets.listActive(context.user.id, period);

    return {
      period,
      currency: context.user.defaultCurrency,
      window: context.window,
      budgets: activeBudgets
        .filter((budget) => budget.currency === context.user.defaultCurrency)
        .map((budget) =>
          calculateBudgetStatus({
            category: budget.category,
            period: budget.period,
            currency: budget.currency,
            limitAmount: budget.limitAmount,
            spentAmount: context.totals.byCategory.get(budget.category) ?? 0,
          }),
        ),
    };
  }

  return {
    async list(input) {
      const user = await resolveUser(input.userId);
      return budgets.listActive(user.id, input.period);
    },

    async getStatus(input) {
      return statusForPeriod(input.userId, input.period);
    },

    async getWeekDashboard(userId) {
      const context = await loadPeriodContext(userId, "week");
      const status = await statusForPeriod(context.user.id, "week");

      return {
        expenses: roundMoney(context.totals.expenses),
        currency: status.currency,
        window: status.window,
        budgets: status.budgets,
      };
    },

    async getMonthDashboard(userId) {
      const context = await loadPeriodContext(userId, "month");
      const status = await statusForPeriod(context.user.id, "month");

      return {
        income: roundMoney(context.totals.income),
        expenses: roundMoney(context.totals.expenses),
        net: roundMoney(context.totals.income - context.totals.expenses),
        currency: context.user.defaultCurrency,
        window: status.window,
        budgets: status.budgets,
      };
    },
  };
}
