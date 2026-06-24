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
      const transactions = await prisma.transaction.findMany({
        where: {
          userId: input.userId,
          deletedAt: null,
          transactionDate: {
            gte: input.start,
            lt: input.end,
          },
        },
        select: {
          type: true,
          amount: true,
          amountEur: true,
          amountUsd: true,
          currency: true,
          category: { select: { name: true } },
        },
      });

      const totals: TransactionTotals = {
        expenses: 0,
        income: 0,
        byCategory: new Map(),
      };

      for (const transaction of transactions) {
        const amount = normalizeTransactionAmountForBudget(
          transaction,
          input.currency,
        );

        if (amount === null) {
          continue;
        }

        if (transaction.type === "income") {
          totals.income += amount;
          continue;
        }

        if (transaction.type !== "expense") {
          continue;
        }

        const category = CategoryNameSchema.parse(transaction.category.name);
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

type TransactionTotalRow = {
  amount: { toNumber(): number };
  amountEur: { toNumber(): number } | null;
  amountUsd: { toNumber(): number } | null;
  currency: Currency;
};

export function normalizeTransactionAmountForBudget(
  transaction: TransactionTotalRow,
  targetCurrency: Currency,
): number | null {
  if (targetCurrency === "EUR") {
    return (
      (transaction.currency === "EUR" ? transaction.amount.toNumber() : null) ??
      transaction.amountEur?.toNumber() ??
      null
    );
  }

  if (targetCurrency === "USD") {
    return (
      (transaction.currency === "USD" ? transaction.amount.toNumber() : null) ??
      transaction.amountUsd?.toNumber() ??
      null
    );
  }

  return transaction.currency === targetCurrency
    ? transaction.amount.toNumber()
    : null;
}
