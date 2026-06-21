// Owner: packages/api-core. Budget repository boundary and Prisma implementation.
import {
  CategoryNameSchema,
  type BudgetPeriod,
  type CategoryName,
  type Currency,
} from "@trackx/shared";
import type { PrismaClient } from "@trackx/db";

export type BudgetRecord = {
  id: string;
  category: CategoryName;
  period: BudgetPeriod;
  limitAmount: number;
  currency: Currency;
};

export type BudgetTotalsInput = {
  userId: string;
  currency: Currency;
  start: Date;
  end: Date;
};

export type TransactionTotals = {
  expenses: number;
  income: number;
  byCategory: Map<CategoryName, number>;
};

export type BudgetRepository = {
  listActive(userId: string, period?: BudgetPeriod): Promise<BudgetRecord[]>;
  getTransactionTotals(input: BudgetTotalsInput): Promise<TransactionTotals>;
};

export function createPrismaBudgetRepository(
  prisma: PrismaClient,
): BudgetRepository {
  return {
    async listActive(userId, period) {
      const budgets = await prisma.budget.findMany({
        where: {
          userId,
          isActive: true,
          ...(period ? { period } : {}),
        },
        orderBy: [{ period: "asc" }, { category: { name: "asc" } }],
        include: { category: true },
      });

      return budgets.map((budget) => ({
        id: budget.id,
        category: CategoryNameSchema.parse(budget.category.name),
        period: budget.period,
        limitAmount: budget.limitAmount.toNumber(),
        currency: budget.currency,
      }));
    },

    async getTransactionTotals(input) {
      const rows = await prisma.transaction.findMany({
        where: {
          userId: input.userId,
          deletedAt: null,
          currency: input.currency,
          transactionDate: {
            gte: input.start,
            lt: input.end,
          },
        },
        include: { category: true },
      });

      const totals: TransactionTotals = {
        expenses: 0,
        income: 0,
        byCategory: new Map(),
      };

      for (const row of rows) {
        const amount = row.amount.toNumber();

        if (row.type === "income") {
          totals.income += amount;
          continue;
        }

        if (row.type !== "expense") {
          continue;
        }

        const category = CategoryNameSchema.parse(row.category.name);
        totals.expenses += amount;
        totals.byCategory.set(
          category,
          (totals.byCategory.get(category) ?? 0) + amount,
        );
      }

      return totals;
    },
  };
}
