// Owner: packages/api-core. Applies and learns per-user merchant category rules.
import type { ParserResponse } from "@trackx/shared";
import type {
  MerchantCategoryRuleRepository,
  MerchantCategoryRuleSource,
} from "../repositories/merchant-category-rules.js";
import type { TransactionRecord } from "../repositories/transactions.js";

export type MerchantCategoryRuleApplyResult = {
  parsed: ParserResponse;
  appliedCount: number;
};

export async function applyMerchantCategoryRules(
  parsed: ParserResponse,
  input: {
    userId: string;
    rules: MerchantCategoryRuleRepository | undefined;
  },
): Promise<MerchantCategoryRuleApplyResult> {
  if (!input.rules || parsed.needsClarification) {
    return { parsed, appliedCount: 0 };
  }

  let appliedCount = 0;
  const transactions = await Promise.all(
    parsed.transactions.map(async (transaction) => {
      if (transaction.type === "income") {
        return transaction;
      }

      const merchant = transaction.merchant ?? transaction.description;
      const rule = await input.rules?.findByMerchant(input.userId, merchant);

      if (!rule) {
        return transaction;
      }

      appliedCount += 1;
      return {
        ...transaction,
        category: rule.category,
        confidence: Math.max(transaction.confidence ?? 0, 0.99),
      };
    }),
  );

  return {
    parsed: { ...parsed, transactions },
    appliedCount,
  };
}

export async function learnMerchantCategoryRuleFromTransaction(
  rules: MerchantCategoryRuleRepository | undefined,
  transaction: TransactionRecord,
  source: MerchantCategoryRuleSource,
): Promise<void> {
  if (!rules || transaction.type === "income") {
    return;
  }

  const merchant = transaction.merchant ?? transaction.description;

  if (!merchant.trim()) {
    return;
  }

  await rules.upsert({
    userId: transaction.userId,
    merchant,
    category: transaction.category,
    source,
  });
}
