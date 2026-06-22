// Owner: packages/shared. Tests concise Telegram budget message formatting.
import { describe, expect, it } from "vitest";
import {
  formatTelegramBudgets,
  formatTelegramBudgetWarning,
} from "../telegram-format.js";

describe("formatTelegramBudgets", () => {
  it("returns concise budget lines without status noise", () => {
    expect(
      formatTelegramBudgets([
        {
          category: "Restaurants / Cafes / Fun",
          period: "week",
          currency: "EUR",
          limitAmount: 50,
          spentAmount: 35.29,
          remainingAmount: 14.71,
          percentageUsed: 70.6,
          status: "ok",
        },
        {
          category: "Transport",
          period: "week",
          currency: "EUR",
          limitAmount: 18,
          spentAmount: 11.6,
          remainingAmount: 6.4,
          percentageUsed: 64.4,
          status: "ok",
        },
      ]),
    ).toBe(["Food & fun 35.29/50 EUR", "Transport 11.6/18 EUR"].join("\n"));
  });

  it("returns a short empty state", () => {
    expect(formatTelegramBudgets([])).toBe("No budgets yet.");
  });

  it("returns concise budget warning text", () => {
    expect(
      formatTelegramBudgetWarning({
        category: "Restaurants / Cafes / Fun",
        period: "week",
        currency: "EUR",
        limitAmount: 50,
        spentAmount: 38,
        remainingAmount: 12,
        percentageUsed: 76,
        status: "warning",
      }),
    ).toBe("Heads up: Food & fun 38/50 EUR used.");
  });
});
