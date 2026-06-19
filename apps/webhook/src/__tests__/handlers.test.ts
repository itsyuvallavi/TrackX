// Owner: apps/webhook. Offline tests for Telegram webhook handlers.
import { describe, expect, it } from "vitest";
import type { TrackxApiClient } from "../api-client.js";
import { handleIncomingMessage, helpText } from "../handlers.js";

describe("handleIncomingMessage", () => {
  it("denies users outside the allowlist", async () => {
    const reply = await handleIncomingMessage(
      { userId: 999, text: "spent 15 eur on food" },
      options(),
    );

    expect(reply).toBe("This Telegram account is not allowed to use TrackX.");
  });

  it("forwards normal text to the API and returns feedback", async () => {
    const reply = await handleIncomingMessage(
      { userId: 123, text: "spent 15 eur on food" },
      options(),
    );

    expect(reply).toBe("Logged 15 EUR for Restaurants / Cafes / Fun.");
  });

  it("returns help for /help", async () => {
    const reply = await handleIncomingMessage(
      { userId: 123, text: "/help" },
      options(),
    );

    expect(reply).toBe(helpText());
  });

  it("returns week budget summaries", async () => {
    const reply = await handleIncomingMessage(
      { userId: 123, text: "/week" },
      options(),
    );

    expect(reply).toContain("Transport: 9/18 EUR (ok)");
  });

  it("undoes the latest telegram transaction", async () => {
    const reply = await handleIncomingMessage(
      { userId: 123, text: "/undo" },
      options(),
    );

    expect(reply).toBe("Undid 15 EUR: food.");
  });
});

function options() {
  return {
    allowedUserIds: ["123"],
    api: fakeApi(),
    timezone: "Europe/Lisbon",
    defaultCurrency: "EUR",
  };
}

function fakeApi(): TrackxApiClient {
  return {
    async createFromMessage() {
      return {
        feedback: "Logged 15 EUR for Restaurants / Cafes / Fun.",
      };
    },
    async getBudgetStatus() {
      return {
        budgets: [
          {
            category: "Transport",
            spentAmount: 9,
            limitAmount: 18,
            currency: "EUR",
            status: "ok",
          },
        ],
      };
    },
    async getMonthDashboard() {
      return {
        income: 200,
        expenses: 50,
        net: 150,
        currency: "EUR",
      };
    },
    async undoLast() {
      return {
        description: "food",
        amount: 15,
        currency: "EUR",
      };
    },
  };
}
