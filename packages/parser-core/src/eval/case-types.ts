// Owner: packages/parser-core. Shared eval case types and helpers.
import type { CategoryName, Currency } from "@trackx/shared";

export type EvalExpected =
  | { clarification: true }
  | {
      clarification?: false;
      count: number;
      type?: "expense" | "income";
      currency?: Currency;
      category?: CategoryName;
      amounts?: number[];
    };

export type EvalCase = {
  id: string;
  message: string;
  expected: EvalExpected;
};

export function one(
  currency: Currency,
  category: CategoryName,
  amount: number,
  type: "expense" | "income" = "expense",
): EvalExpected {
  return { count: 1, type, currency, category, amounts: [amount] };
}

export function many(
  currency: Currency,
  count: number,
  amounts: number[],
): EvalExpected {
  return { count, currency, amounts };
}

export function clarify(): EvalExpected {
  return { clarification: true };
}
