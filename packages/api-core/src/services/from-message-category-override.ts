// Owner: packages/api-core. Applies trusted category overrides to parser output.
import type { CategoryName, ParserResponse } from "@trackx/shared";

export function applyCategoryOverride(
  parsed: ParserResponse,
  categoryOverride?: CategoryName,
): ParserResponse {
  if (!categoryOverride || parsed.needsClarification) {
    return parsed;
  }

  return {
    ...parsed,
    transactions: parsed.transactions.map((transaction) =>
      transaction.type === "income" ||
      (transaction.category !== "Misc" && transaction.confidence >= 0.8)
        ? transaction
        : {
            ...transaction,
            category: categoryOverride,
            confidence: Math.max(transaction.confidence, 0.98),
          },
    ),
  };
}
