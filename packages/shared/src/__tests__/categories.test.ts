// Owner: packages/shared. Category name resolution tests for command surfaces.
import { describe, expect, it } from "vitest";
import { resolveCategoryName } from "../categories.js";

describe("resolveCategoryName", () => {
  it.each([
    ["Restaurants / Cafes / Fun", "Restaurants / Cafes / Fun"],
    ["restaurants cafes fun", "Restaurants / Cafes / Fun"],
    ["fun", "Restaurants / Cafes / Fun"],
    ["groceries", "Groceries"],
    ["subscriptions", "Subscriptions / Tools"],
    ["unknown", null],
  ])("resolves %s to %s", (input, expected) => {
    expect(resolveCategoryName(input)).toBe(expected);
  });
});
