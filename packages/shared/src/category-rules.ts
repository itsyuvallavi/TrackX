// Owner: packages/shared. Deterministic merchant and phrase rules for transaction categories.
import type { CategoryName } from "./categories.js";

export type CategoryRuleMatch = {
  category: CategoryName;
  confidence: number;
  reason: string;
};

type CategoryRule = {
  category: CategoryName;
  confidence: number;
  reason: string;
  patterns: readonly RegExp[];
};

const CATEGORY_RULES: readonly CategoryRule[] = [
  {
    category: "Restaurants / Cafes / Fun",
    confidence: 0.98,
    reason: "food delivery merchant",
    patterns: [/\bbolt food\b/, /\buber eats\b/, /\btoo good to go\b/],
  },
  {
    category: "Transport",
    confidence: 0.98,
    reason: "transport merchant or route",
    patterns: [
      /\bbolt ride\b/,
      /\bmetro\b/,
      /\bbus\b/,
      /\btrain\b/,
      /\bcarris\b/,
    ],
  },
  {
    category: "Groceries",
    confidence: 0.96,
    reason: "grocery merchant",
    patterns: [
      /\bmaria granel\b/,
      /\bceleiro\b/,
      /\bconsigo\b/,
      /\bpingo doce\b/,
      /\bauchan\b/,
      /\baldi\b/,
      /\bcontinente\b/,
    ],
  },
  {
    category: "Utilities",
    confidence: 0.96,
    reason: "utility provider",
    patterns: [/\bvodafone\b/, /\bepal\b/, /\bedp\b/],
  },
  {
    category: "Subscriptions / Tools",
    confidence: 0.94,
    reason: "subscription or software tool",
    patterns: [
      /\bopenai\b/,
      /\bcursor\b/,
      /\byoutube\b/,
      /\bpatreon\b/,
      /\bhbo\b/,
      /\boura\b/,
    ],
  },
  {
    category: "Home",
    confidence: 0.94,
    reason: "home or household item",
    patterns: [
      /\bikea\b/,
      /\bkitchen\b/,
      /\bcleaning\b/,
      /\bfurniture\b/,
      /\btowels?\b/,
      /\bbedding\b/,
    ],
  },
  {
    category: "Travel",
    confidence: 0.94,
    reason: "travel purchase",
    patterns: [/\bflights?\b/, /\bryanair\b/, /\bel al\b/, /\bhotels?\b/],
  },
  {
    category: "Shopping",
    confidence: 0.85,
    reason: "shopping merchant or item",
    patterns: [/\bamazon\b/, /\bzara\b/, /\belectronics\b/, /\bclothes\b/],
  },
  {
    category: "Restaurants / Cafes / Fun",
    confidence: 0.72,
    reason: "generic restaurant or cafe wording",
    patterns: [
      /\bcafes?\b/,
      /\bcoffee\b/,
      /\brestaurants?\b/,
      /\bdinner\b/,
      /\bdrinks\b/,
      /\bfood\b/,
    ],
  },
];

export function matchCategory(input: string): CategoryRuleMatch {
  const normalized = normalizeForMatching(input);

  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return {
        category: rule.category,
        confidence: rule.confidence,
        reason: rule.reason,
      };
    }
  }

  return {
    category: "Misc",
    confidence: 0.2,
    reason: "no deterministic category rule matched",
  };
}

export function normalizeForMatching(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s/]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}
