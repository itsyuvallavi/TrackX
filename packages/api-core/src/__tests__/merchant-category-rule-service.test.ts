// Owner: packages/api-core. Tests merchant category memory application and learning.
import { describe, expect, it, vi } from "vitest";
import type { ParserResponse } from "@trackx/shared";
import type {
  MerchantCategoryRuleRecord,
  MerchantCategoryRuleRepository,
} from "../repositories/merchant-category-rules.js";
import type { TransactionRecord } from "../repositories/transactions.js";
import {
  applyMerchantCategoryRules,
  learnMerchantCategoryRuleFromTransaction,
} from "../services/merchant-category-rule-service.js";

describe("applyMerchantCategoryRules", () => {
  it("overrides expense categories from user merchant memory", async () => {
    const rules = merchantRuleRepository({
      merchantPattern: "Melbourne Elouera",
      category: "Restaurants / Cafes / Fun",
    });

    const result = await applyMerchantCategoryRules(parserResponse(), {
      userId,
      rules,
    });

    expect(result.appliedCount).toBe(1);
    expect(result.parsed.transactions[0]?.category).toBe(
      "Restaurants / Cafes / Fun",
    );
    expect(result.parsed.transactions[0]?.confidence).toBe(0.99);
  });

  it("does not override income transactions", async () => {
    const rules = merchantRuleRepository({
      merchantPattern: "Company",
      category: "Restaurants / Cafes / Fun",
    });

    const result = await applyMerchantCategoryRules(
      {
        ...parserResponse(),
        transactions: [
          {
            amount: 200,
            currency: "EUR",
            type: "income",
            category: "Income",
            description: "Company",
            merchant: "Company",
            confidence: 0.9,
          },
        ],
      },
      { userId, rules },
    );

    expect(result.appliedCount).toBe(0);
    expect(result.parsed.transactions[0]?.category).toBe("Income");
  });
});

describe("learnMerchantCategoryRuleFromTransaction", () => {
  it("upserts merchant category rules from corrected transactions", async () => {
    const rules = merchantRuleRepository();

    await learnMerchantCategoryRuleFromTransaction(
      rules,
      transactionRecord({
        merchant: "Panda Cantina",
        category: "Restaurants / Cafes / Fun",
      }),
      "manual",
    );

    expect(rules.upsert).toHaveBeenCalledWith({
      userId,
      merchant: "Panda Cantina",
      category: "Restaurants / Cafes / Fun",
      source: "manual",
    });
  });

  it("ignores income transactions", async () => {
    const rules = merchantRuleRepository();

    await learnMerchantCategoryRuleFromTransaction(
      rules,
      transactionRecord({
        type: "income",
        category: "Income",
        merchant: "Company",
      }),
      "manual",
    );

    expect(rules.upsert).not.toHaveBeenCalled();
  });
});

const userId = "00000000-0000-4000-8000-000000000001";

function merchantRuleRepository(
  override?: Partial<MerchantCategoryRuleRecord>,
): MerchantCategoryRuleRepository {
  const rule: MerchantCategoryRuleRecord | null = override
    ? {
        id: "rule-1",
        userId,
        merchantPattern: "Merchant",
        normalizedMerchant: "merchant",
        category: "Misc",
        source: "manual",
        createdAt: "2026-07-01T00:00:00.000Z",
        updatedAt: "2026-07-01T00:00:00.000Z",
        ...override,
      }
    : null;

  return {
    findByMerchant: vi.fn(async () => rule),
    upsert: vi.fn(async () => rule),
  };
}

function parserResponse(): ParserResponse {
  return {
    confidence: 0.9,
    transactions: [
      {
        amount: 3,
        currency: "EUR",
        type: "expense",
        category: "Misc",
        description: "Melbourne Elouera",
        merchant: "Melbourne Elouera",
        confidence: 0.8,
      },
    ],
    needsClarification: false,
    clarifyingQuestion: null,
    parser: "openai",
  };
}

function transactionRecord(
  overrides: Partial<TransactionRecord>,
): TransactionRecord {
  return {
    id: "transaction-1",
    userId,
    type: "expense",
    amount: 3,
    currency: "EUR",
    amountEur: 3,
    amountUsd: null,
    category: "Misc",
    description: "Merchant",
    merchant: "Merchant",
    source: "import",
    rawMessage: "3 eur for Merchant",
    transactionDate: "2026-07-01",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}
