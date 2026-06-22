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

export type BudgetLimitRecordInput = {
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
  upsertMany(
    userId: string,
    budgets: BudgetLimitRecordInput[],
  ): Promise<BudgetRecord[]>;
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

    async upsertMany(userId, budgetInputs) {
      await prisma.$transaction(async (tx) => {
        for (const input of budgetInputs) {
          const category = await tx.category.findUniqueOrThrow({
            where: { name: input.category },
            select: { id: true },
          });

          if (input.limitAmount <= 0) {
            await tx.budget.updateMany({
              where: {
                userId,
                categoryId: category.id,
                period: input.period,
              },
              data: { isActive: false },
            });
            continue;
          }

          await tx.budget.upsert({
            where: {
              userId_categoryId_period: {
                userId,
                categoryId: category.id,
                period: input.period,
              },
            },
            create: {
              userId,
              categoryId: category.id,
              period: input.period,
              limitAmount: input.limitAmount,
              currency: input.currency,
              isActive: true,
            },
            update: {
              limitAmount: input.limitAmount,
              currency: input.currency,
              isActive: true,
            },
          });
        }
      });

      return this.listActive(userId);
    },

    async getTransactionTotals(input) {
      const rows = await prisma.transaction.groupBy({
        by: ["type", "categoryId"],
        where: {
          userId: input.userId,
          deletedAt: null,
          currency: input.currency,
          transactionDate: {
            gte: input.start,
            lt: input.end,
          },
        },
        _sum: { amount: true },
      });
      const categoryIds = rows
        .filter((row) => row.type === "expense")
        .map((row) => row.categoryId);
      const categories =
        categoryIds.length > 0
          ? await prisma.category.findMany({
              where: { id: { in: categoryIds } },
              select: { id: true, name: true },
            })
          : [];
      const categoryById = new Map(
        categories.map((category) => [category.id, category.name]),
      );

      const totals: TransactionTotals = {
        expenses: 0,
        income: 0,
        byCategory: new Map(),
      };

      for (const row of rows) {
        const amount = row._sum.amount?.toNumber() ?? 0;

        if (row.type === "income") {
          totals.income += amount;
          continue;
        }

        if (row.type !== "expense") {
          continue;
        }

        const category = CategoryNameSchema.parse(
          categoryById.get(row.categoryId),
        );
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
