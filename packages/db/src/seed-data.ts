// Owner: packages/db. Default local seed data derived from shared TrackX rules.
import {
  CATEGORY_NAMES,
  DEFAULT_BUDGETS,
  type CategoryKind,
  type CategoryName,
} from "@trackx/shared";
import type { PrismaClient } from "@prisma/client";

export const DEFAULT_LOCAL_USER_ID = "00000000-0000-4000-8000-000000000001";
export const DEFAULT_LOCAL_USER_EMAIL = "local@trackx.dev";
export const DEFAULT_LOCAL_TIMEZONE = "Europe/Lisbon";

export type SeedCategory = {
  name: CategoryName;
  kind: CategoryKind;
  isDefault: true;
};

export type SeedBudget = {
  category: CategoryName;
  period: "month" | "week";
  limitAmount: number;
  currency: "EUR";
};

export const seedCategories: readonly SeedCategory[] = CATEGORY_NAMES.map(
  (name) => ({
    name,
    kind: name === "Income" ? "income" : "expense",
    isDefault: true,
  }),
);

export const seedBudgets: readonly SeedBudget[] = DEFAULT_BUDGETS.flatMap(
  ({ category, monthly, weekly }) => {
    const budgets: SeedBudget[] = [
      {
        category,
        period: "month",
        limitAmount: monthly,
        currency: "EUR",
      },
    ];

    if (weekly !== null) {
      budgets.push({
        category,
        period: "week",
        limitAmount: weekly,
        currency: "EUR",
      });
    }

    return budgets;
  },
);

export type SeedDefaultDataResult = {
  userId: string;
  categories: number;
  budgets: number;
};

export async function seedDefaultData(
  prisma: PrismaClient,
): Promise<SeedDefaultDataResult> {
  await prisma.user.upsert({
    where: { id: DEFAULT_LOCAL_USER_ID },
    create: {
      id: DEFAULT_LOCAL_USER_ID,
      email: DEFAULT_LOCAL_USER_EMAIL,
      defaultCurrency: "EUR",
      timezone: DEFAULT_LOCAL_TIMEZONE,
    },
    update: {
      defaultCurrency: "EUR",
      timezone: DEFAULT_LOCAL_TIMEZONE,
    },
  });

  for (const category of seedCategories) {
    await prisma.category.upsert({
      where: { name: category.name },
      create: category,
      update: {
        kind: category.kind,
        isDefault: true,
      },
    });
  }

  for (const budget of seedBudgets) {
    const category = await prisma.category.findUniqueOrThrow({
      where: { name: budget.category },
      select: { id: true },
    });

    await prisma.budget.upsert({
      where: {
        userId_categoryId_period: {
          userId: DEFAULT_LOCAL_USER_ID,
          categoryId: category.id,
          period: budget.period,
        },
      },
      create: {
        userId: DEFAULT_LOCAL_USER_ID,
        categoryId: category.id,
        period: budget.period,
        limitAmount: budget.limitAmount,
        currency: budget.currency,
      },
      update: {
        limitAmount: budget.limitAmount,
        currency: budget.currency,
        isActive: true,
      },
    });
  }

  return {
    userId: DEFAULT_LOCAL_USER_ID,
    categories: seedCategories.length,
    budgets: seedBudgets.length,
  };
}
