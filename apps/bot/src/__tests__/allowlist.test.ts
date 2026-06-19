// Owner: apps/bot. Allowlist access-control tests.
import { describe, expect, it } from "vitest";
import { deniedMessage, isTelegramUserAllowed } from "../allowlist.js";

describe("isTelegramUserAllowed", () => {
  it("denies everyone when allowlist is empty", () => {
    expect(isTelegramUserAllowed(123, [])).toEqual({
      allowed: false,
      reason: "empty_allowlist",
    });
  });

  it("allows exact user id matches", () => {
    expect(isTelegramUserAllowed(123, ["123"])).toEqual({
      allowed: true,
      reason: "allowed",
    });
  });

  it("denies non-matching ids", () => {
    expect(isTelegramUserAllowed(123, ["1234"])).toEqual({
      allowed: false,
      reason: "not_allowed",
    });
  });

  it("returns a setup-safe denial message", () => {
    expect(deniedMessage({ allowed: false, reason: "empty_allowlist" })).toBe(
      "TrackX is not configured for Telegram access yet.",
    );
  });
});
