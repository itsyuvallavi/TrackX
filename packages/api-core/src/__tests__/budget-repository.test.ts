// Owner: packages/api-core. Budget repository amount-normalization regression tests.
import { describe, expect, it } from "vitest";
import { normalizeTransactionAmountForBudget } from "../repositories/budgets.js";

describe("normalizeTransactionAmountForBudget", () => {
  it("uses the source amount when it already matches the target currency", () => {
    const amount = normalizeTransactionAmountForBudget(
      {
        amount: decimal(2.1),
        amountEur: decimal(1.9),
        amountUsd: null,
        currency: "EUR",
      },
      "EUR",
    );

    expect(amount).toBe(2.1);
  });

  it("uses cached normalized amounts only when the source currency differs", () => {
    const amount = normalizeTransactionAmountForBudget(
      {
        amount: decimal(10),
        amountEur: decimal(9.2),
        amountUsd: null,
        currency: "USD",
      },
      "EUR",
    );

    expect(amount).toBe(9.2);
  });
});

function decimal(value: number) {
  return {
    toNumber() {
      return value;
    },
  };
}
