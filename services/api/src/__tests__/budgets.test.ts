// Owner: services/api. API budget route tests with in-memory repositories.
import { describe, expect, it } from "vitest";
import type { ApiConfig } from "@trackx/config";
import type { BudgetPeriod, CategoryName, Currency } from "@trackx/shared";
import { buildApiServer } from "../server.js";
import type { UserRepository } from "../repositories/users.js";
import {
  createBudgetService,
  type BudgetService,
} from "../services/budget-service.js";
import type {
  BudgetRecord,
  BudgetRepository,
  BudgetTotalsInput,
  TransactionTotals,
} from "../repositories/budgets.js";

const defaultUserId = "00000000-0000-4000-8000-000000000001";
const config: ApiConfig = {
  databaseUrl: "postgresql://postgres:postgres@localhost:5432/trackx",
  redisUrl: "redis://localhost:6379",
  defaultTimezone: "Europe/Lisbon",
  defaultCurrency: "EUR",
  apiPort: 4001,
  apiBaseUrl: "http://localhost:4001",
  parserBaseUrl: "http://localhost:4002",
};

describe("budget routes", () => {
  it("lists active budgets for the default user", async () => {
    const server = await serverWithBudgetService();
    const response = await server.inject({ method: "GET", url: "/budgets" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([
      {
        id: "budget-groceries-month",
        category: "Groceries",
        period: "month",
        limitAmount: 260,
        currency: "EUR",
      },
      {
        id: "budget-transport-week",
        category: "Transport",
        period: "week",
        limitAmount: 18,
        currency: "EUR",
      },
    ]);
  });

  it("returns period budget status with timezone-aware windows", async () => {
    const server = await serverWithBudgetService();
    const response = await server.inject({
      method: "GET",
      url: "/budgets/status?period=week",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      period: "week",
      currency: "EUR",
      window: {
        start: "2026-06-15T00:00:00.000Z",
        end: "2026-06-22T00:00:00.000Z",
      },
      budgets: [
        {
          category: "Transport",
          spentAmount: 21,
          remainingAmount: -3,
          status: "over",
        },
      ],
    });
  });

  it("returns month dashboard cashflow", async () => {
    const server = await serverWithBudgetService();
    const response = await server.inject({
      method: "GET",
      url: "/dashboard/month",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      income: 200,
      expenses: 123,
      net: 77,
      currency: "EUR",
    });
  });

  it("returns 400 for invalid budget period", async () => {
    const server = await serverWithBudgetService();
    const response = await server.inject({
      method: "GET",
      url: "/budgets/status?period=year",
    });

    expect(response.statusCode).toBe(400);
  });
});

async function serverWithBudgetService() {
  return buildApiServer({
    config,
    budgetService: createInMemoryBudgetService(),
  });
}

function createInMemoryBudgetService(): BudgetService {
  const users: UserRepository = {
    async ensureDefaultUser() {
      return {
        id: defaultUserId,
        defaultCurrency: "EUR",
        timezone: "Europe/Lisbon",
      };
    },
    async findById(userId) {
      return userId === defaultUserId
        ? {
            id: defaultUserId,
            defaultCurrency: "EUR",
            timezone: "Europe/Lisbon",
          }
        : null;
    },
  };
  const budgets: BudgetRepository = {
    async listActive(_userId, period) {
      return seedBudgets.filter(
        (budget) => !period || budget.period === period,
      );
    },
    async getTransactionTotals(input) {
      return totalsFor(input);
    },
  };

  return createBudgetService(
    users,
    budgets,
    () => new Date("2026-06-19T12:00:00.000Z"),
  );
}

const seedBudgets: BudgetRecord[] = [
  {
    id: "budget-groceries-month",
    category: "Groceries",
    period: "month",
    limitAmount: 260,
    currency: "EUR",
  },
  {
    id: "budget-transport-week",
    category: "Transport",
    period: "week",
    limitAmount: 18,
    currency: "EUR",
  },
];

function totalsFor(input: BudgetTotalsInput): TransactionTotals {
  const byCategory = new Map<CategoryName, number>();
  const rows = transactions.filter(
    (transaction) =>
      transaction.userId === input.userId &&
      transaction.currency === input.currency &&
      transaction.date >= input.start &&
      transaction.date < input.end &&
      !transaction.deleted,
  );
  let expenses = 0;
  let income = 0;

  for (const row of rows) {
    if (row.type === "income") {
      income += row.amount;
      continue;
    }

    expenses += row.amount;
    byCategory.set(
      row.category,
      (byCategory.get(row.category) ?? 0) + row.amount,
    );
  }

  return { expenses, income, byCategory };
}

const transactions: Array<{
  userId: string;
  type: "expense" | "income";
  amount: number;
  currency: Currency;
  category: CategoryName;
  date: Date;
  deleted?: true;
}> = [
  {
    userId: defaultUserId,
    type: "expense",
    amount: 102,
    currency: "EUR",
    category: "Groceries",
    date: new Date("2026-06-10T00:00:00.000Z"),
  },
  {
    userId: defaultUserId,
    type: "expense",
    amount: 21,
    currency: "EUR",
    category: "Transport",
    date: new Date("2026-06-18T00:00:00.000Z"),
  },
  {
    userId: defaultUserId,
    type: "income",
    amount: 200,
    currency: "EUR",
    category: "Income",
    date: new Date("2026-06-11T00:00:00.000Z"),
  },
  {
    userId: defaultUserId,
    type: "expense",
    amount: 50,
    currency: "EUR",
    category: "Shopping",
    date: new Date("2026-06-11T00:00:00.000Z"),
    deleted: true,
  },
];
