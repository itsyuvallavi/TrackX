// Owner: apps/bot. Command and text handler tests with mocked API client.
import { describe, expect, it } from "vitest";
import type { TrackxApiClient } from "../api-client.js";
import { handleTextMessage, helpText, type BotContext } from "../commands.js";

describe("handleTextMessage", () => {
  it("denies users outside the allowlist", async () => {
    const ctx = createContext(999, "spent 15 eur on food");

    await handleTextMessage(ctx, options());

    expect(ctx.replies).toEqual([
      "This Telegram account is not allowed to use TrackX.",
    ]);
  });

  it("forwards normal text to the API and replies with feedback", async () => {
    const ctx = createContext(123, "spent 15 eur on food");

    await handleTextMessage(ctx, options());

    expect(ctx.replies).toEqual([
      "Logged 15 EUR for Restaurants / Cafes / Fun.",
    ]);
  });

  it("shows help for /help", async () => {
    const ctx = createContext(123, "/help");

    await handleTextMessage(ctx, options());

    expect(ctx.replies).toEqual([helpText()]);
  });

  it("returns week budget summaries", async () => {
    const ctx = createContext(123, "/week");

    await handleTextMessage(ctx, options());

    expect(ctx.replies[0]).toContain("Transport: 9/18 EUR (ok)");
  });

  it("undoes the latest telegram transaction", async () => {
    const ctx = createContext(123, "/undo");

    await handleTextMessage(ctx, options());

    expect(ctx.replies).toEqual(["Undid 15 EUR: food."]);
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
        transactions: [],
        needsClarification: false,
        clarifyingQuestion: null,
        feedback: "Logged 15 EUR for Restaurants / Cafes / Fun.",
        parser: "openai",
      };
    },
    async getBudgetStatus() {
      return {
        budgets: [
          {
            category: "Transport",
            period: "week",
            currency: "EUR",
            limitAmount: 18,
            spentAmount: 9,
            remainingAmount: 9,
            percentageUsed: 50,
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

function createContext(
  userId: number,
  text: string,
): BotContext & {
  replies: string[];
} {
  const replies: string[] = [];

  return {
    from: { id: userId },
    message: { text },
    replies,
    async reply(message: string) {
      replies.push(message);
      return undefined;
    },
  };
}
