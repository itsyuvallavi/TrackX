// Owner: packages/api-core. Tests budget warnings for newly logged transactions.
import { describe, expect, it } from "vitest";
import type { BudgetService, TransactionRecord } from "../index.js";
import { createBudgetAlertService } from "../index.js";

describe("createBudgetAlertService", () => {
  it("warns for affected expense categories at warning or over status", async () => {
    const service = createBudgetAlertService(budgetService());

    await expect(
      service.warningsForTransactions({
        userId: "user-1",
        transactions: [
          transaction({ category: "Restaurants / Cafes / Fun" }),
          transaction({ type: "income", category: "Income" }),
        ],
      }),
    ).resolves.toEqual(["Heads up: Food & fun 38/50 EUR used."]);
  });
});

function budgetService(): BudgetService {
  return {
    async list() {
      return [];
    },
    async getStatus(input) {
      return {
        period: input.period,
        currency: "EUR",
        window: {
          start: "2026-06-15T00:00:00.000Z",
          end: "2026-06-22T00:00:00.000Z",
        },
        budgets:
          input.period === "week"
            ? [
                {
                  category: "Restaurants / Cafes / Fun",
                  period: "week",
                  currency: "EUR",
                  limitAmount: 50,
                  spentAmount: 38,
                  remainingAmount: 12,
                  percentageUsed: 76,
                  status: "warning",
                },
                {
                  category: "Transport",
                  period: "week",
                  currency: "EUR",
                  limitAmount: 18,
                  spentAmount: 18.5,
                  remainingAmount: -0.5,
                  percentageUsed: 102.8,
                  status: "over",
                },
              ]
            : [],
      };
    },
    async getWeekDashboard() {
      throw new Error("not used");
    },
    async getMonthDashboard() {
      throw new Error("not used");
    },
  };
}

function transaction(
  overrides: Partial<TransactionRecord> = {},
): TransactionRecord {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    userId: "user-1",
    type: "expense",
    amount: 15,
    currency: "EUR",
    category: "Restaurants / Cafes / Fun",
    description: "food",
    merchant: null,
    source: "telegram",
    rawMessage: "spent 15 eur on food",
    transactionDate: "2026-06-21",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}
