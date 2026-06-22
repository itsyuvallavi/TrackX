// Owner: packages/api-core. Transaction list ordering for dashboard vs bot edits.
import { describe, expect, it } from "vitest";
import { compareTransactionsForList } from "../repositories/transactions.js";

const base = {
  transactionDate: "2026-06-21",
  createdAt: "2026-06-21T10:00:00.000Z",
};

describe("compareTransactionsForList", () => {
  it("orders logged lists by createdAt", () => {
    const olderDate = { ...base, transactionDate: "2026-06-22" };
    const newerLog = {
      ...base,
      transactionDate: "2026-06-01",
      createdAt: "2026-06-22T10:00:00.000Z",
    };

    expect(
      compareTransactionsForList(newerLog, olderDate, "logged"),
    ).toBeLessThan(0);
  });

  it("orders transactionDate lists by date then createdAt", () => {
    const newerDate = {
      ...base,
      transactionDate: "2026-06-22",
      createdAt: "2026-06-21T10:00:00.000Z",
    };
    const olderDate = {
      ...base,
      transactionDate: "2026-06-21",
      createdAt: "2026-06-22T10:00:00.000Z",
    };

    expect(
      compareTransactionsForList(newerDate, olderDate, "transactionDate"),
    ).toBeLessThan(0);
  });
});
