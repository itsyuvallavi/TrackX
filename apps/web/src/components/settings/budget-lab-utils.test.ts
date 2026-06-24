// Owner: apps/web. Tests budget settings payloads that drive dashboard totals.
import { describe, expect, it } from "vitest";
import {
  toMonthlyBudgetPayloadRows,
  toWeeklyBudgetPayloadRows,
  type MoneyRow,
} from "./budget-lab-utils";

describe("budget lab payload mapping", () => {
  it("sends zero monthly rows for removed categories so the dashboard deactivates them", () => {
    const fixedRows: MoneyRow[] = [
      { category: "Rent", id: "rent", label: "Rent", amount: 1000 },
    ];
    const flexRows: MoneyRow[] = [
      {
        category: "Groceries",
        id: "groceries",
        label: "Groceries",
        amount: 260,
      },
    ];

    const payload = toMonthlyBudgetPayloadRows(fixedRows, flexRows);

    expect(payload).toContainEqual({
      category: "Rent",
      period: "month",
      limitAmount: 1000,
      currency: "EUR",
    });
    expect(payload).toContainEqual({
      category: "Groceries",
      period: "month",
      limitAmount: 260,
      currency: "EUR",
    });
    expect(payload).toContainEqual({
      category: "Transport",
      period: "month",
      limitAmount: 0,
      currency: "EUR",
    });
  });

  it("derives weekly dashboard budgets from spending rows only", () => {
    const flexRows: MoneyRow[] = [
      {
        category: "Groceries",
        id: "groceries",
        label: "Groceries",
        amount: 260,
      },
      {
        category: "Restaurants / Cafes / Fun",
        id: "food",
        label: "Food & fun",
        amount: 200,
      },
    ];

    const payload = toWeeklyBudgetPayloadRows(flexRows);

    expect(payload).toContainEqual({
      category: "Groceries",
      period: "week",
      limitAmount: 65,
      currency: "EUR",
    });
    expect(payload).toContainEqual({
      category: "Restaurants / Cafes / Fun",
      period: "week",
      limitAmount: 50,
      currency: "EUR",
    });
    expect(payload).toContainEqual({
      category: "Rent",
      period: "week",
      limitAmount: 0,
      currency: "EUR",
    });
    expect(payload).toContainEqual({
      category: "Utilities",
      period: "week",
      limitAmount: 0,
      currency: "EUR",
    });
  });
});
