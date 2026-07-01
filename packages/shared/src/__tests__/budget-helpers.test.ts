// Owner: packages/shared. Tests for pure budget calculations and period windows.
import { describe, expect, it } from "vitest";
import { calculateBudgetStatus, getPeriodWindow } from "../index.js";

describe("calculateBudgetStatus", () => {
  it("returns ok status below warning threshold", () => {
    expect(
      calculateBudgetStatus({
        category: "Groceries",
        period: "month",
        currency: "EUR",
        limitAmount: 260,
        spentAmount: 102,
      }),
    ).toEqual({
      category: "Groceries",
      period: "month",
      currency: "EUR",
      limitAmount: 260,
      spentAmount: 102,
      remainingAmount: 158,
      percentageUsed: 39.2,
      status: "ok",
    });
  });

  it("returns warning status at 75 percent budget usage", () => {
    const status = calculateBudgetStatus({
      category: "Restaurants / Cafes / Fun",
      period: "week",
      currency: "EUR",
      limitAmount: 50,
      spentAmount: 37.5,
    });

    expect(status.percentageUsed).toBe(75);
    expect(status.remainingAmount).toBe(12.5);
    expect(status.status).toBe("warning");
  });

  it("returns over status above budget", () => {
    const status = calculateBudgetStatus({
      category: "Transport",
      period: "week",
      currency: "EUR",
      limitAmount: 18,
      spentAmount: 21.32,
    });

    expect(status.percentageUsed).toBe(118.4);
    expect(status.remainingAmount).toBe(-3.32);
    expect(status.status).toBe("over");
  });
});

describe("getPeriodWindow", () => {
  it("returns a Monday-to-Monday week window for Europe/Lisbon", () => {
    const window = getPeriodWindow(
      new Date("2026-06-16T12:00:00.000Z"),
      "week",
      "Europe/Lisbon",
    );

    expect(window.start.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-06-22T00:00:00.000Z");
  });

  it("returns a calendar month window for Europe/Lisbon", () => {
    const window = getPeriodWindow(
      new Date("2026-06-16T12:00:00.000Z"),
      "month",
      "Europe/Lisbon",
    );

    expect(window.start.toISOString()).toBe("2026-06-01T00:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });

  it("trims hidden whitespace from valid timezone names", () => {
    const window = getPeriodWindow(
      new Date("2026-06-16T12:00:00.000Z"),
      "week",
      "Europe/Lisbon\n",
    );

    expect(window.start.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    expect(window.end.toISOString()).toBe("2026-06-22T00:00:00.000Z");
  });
});
