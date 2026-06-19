// Owner: packages/shared. Regression tests for deterministic category mapping.
import { describe, expect, it } from "vitest";
import { matchCategory, normalizeForMatching } from "../category-rules.js";

describe("matchCategory", () => {
  it.each([
    ["bolt ride 7 eur", "Transport"],
    ["spent 2.3 euro on bus", "Transport"],
    ["Bolt Food 14 eur", "Restaurants / Cafes / Fun"],
    ["Uber Eats dinner 21 eur", "Restaurants / Cafes / Fun"],
    ["Too Good To Go 5 eur", "Restaurants / Cafes / Fun"],
    ["Pingo Doce 32 eur", "Groceries"],
    ["Maria Granel 10 eur", "Groceries"],
    ["Celeiro vitamins 18 eur", "Groceries"],
    ["Vodafone 82 eur", "Utilities"],
    ["EPAL water bill", "Utilities"],
    ["EDP electricity", "Utilities"],
    ["IKEA shelf 35 eur", "Home"],
    ["new bedding 40 eur", "Home"],
    ["Ryanair flight 200 eur", "Travel"],
    ["hotel in Madrid 120 eur", "Travel"],
    ["OpenAI subscription 20 usd", "Subscriptions / Tools"],
  ])("maps %s to %s", (message, expectedCategory) => {
    expect(matchCategory(message).category).toBe(expectedCategory);
  });

  it("prioritizes Bolt Food over generic Bolt transport wording", () => {
    const match = matchCategory("bolt food lunch 14 eur");

    expect(match.category).toBe("Restaurants / Cafes / Fun");
    expect(match.reason).toBe("food delivery merchant");
  });

  it("falls back to Misc when no deterministic rule matches", () => {
    const match = matchCategory("random thing 11 eur");

    expect(match).toEqual({
      category: "Misc",
      confidence: 0.2,
      reason: "no deterministic category rule matched",
    });
  });
});

describe("normalizeForMatching", () => {
  it("normalizes case, punctuation, spacing, and accents", () => {
    expect(normalizeForMatching("  PINGO   DOCE, café!  ")).toBe(
      "pingo doce cafe",
    );
  });
});
