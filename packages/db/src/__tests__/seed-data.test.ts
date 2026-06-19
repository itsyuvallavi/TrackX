// Owner: packages/db. Tests that local seed data matches shared product defaults.
import { CATEGORY_NAMES, DEFAULT_BUDGETS } from "@trackx/shared";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCAL_USER_EMAIL,
  DEFAULT_LOCAL_USER_ID,
  seedBudgets,
  seedCategories,
} from "../seed-data.js";

describe("seed data", () => {
  it("contains every default category exactly once", () => {
    const names = seedCategories.map((category) => category.name);

    expect(names).toEqual([...CATEGORY_NAMES]);
    expect(new Set(names).size).toBe(CATEGORY_NAMES.length);
  });

  it("marks only Income as an income category", () => {
    expect(seedCategories).toContainEqual({
      name: "Income",
      kind: "income",
      isDefault: true,
    });
    expect(
      seedCategories
        .filter((category) => category.name !== "Income")
        .every((category) => category.kind === "expense"),
    ).toBe(true);
  });

  it("creates monthly and weekly budgets from shared defaults", () => {
    const expectedCount = DEFAULT_BUDGETS.reduce(
      (count, budget) => count + (budget.weekly === null ? 1 : 2),
      0,
    );

    expect(seedBudgets).toHaveLength(expectedCount);
    expect(seedBudgets).toContainEqual({
      category: "Groceries",
      period: "month",
      limitAmount: 260,
      currency: "EUR",
    });
    expect(seedBudgets).toContainEqual({
      category: "Groceries",
      period: "week",
      limitAmount: 65,
      currency: "EUR",
    });
  });

  it("uses deterministic local user identifiers without secrets", () => {
    expect(DEFAULT_LOCAL_USER_ID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(DEFAULT_LOCAL_USER_EMAIL).toBe("local@trackx.dev");
  });
});
