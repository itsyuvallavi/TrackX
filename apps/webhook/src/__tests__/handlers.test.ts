// Owner: apps/webhook. Offline tests for Telegram webhook handlers.
import { describe, expect, it } from "vitest";
import {
  TrackxApiUnauthorizedError,
  type TrackxApiClient,
} from "../api-client.js";
import { handleIncomingMessage, helpText } from "../handlers.js";

describe("handleIncomingMessage", () => {
  it("forwards normal messages without allowlist membership", async () => {
    const calls: Array<{ telegramUserId?: string }> = [];
    const reply = await handleIncomingMessage(
      { userId: 999, text: "spent 15 eur on food" },
      options({
        api: fakeApi({
          async createFromMessage(input) {
            calls.push({ telegramUserId: input.telegramUserId });
            return { feedback: "Logged 15 EUR for Groceries." };
          },
        }),
      }),
    );

    expect(calls).toEqual([{ telegramUserId: "999" }]);
    expect(reply).toBe("Logged 15 EUR for Groceries.");
  });

  it("asks unlinked users to connect when the API rejects access", async () => {
    const reply = await handleIncomingMessage(
      { userId: 999, text: "spent 15 eur on food" },
      options({
        api: fakeApi({
          async createFromMessage() {
            throw new TrackxApiUnauthorizedError();
          },
        }),
      }),
    );

    expect(reply).toBe("Connect Telegram in TrackX Settings first.");
  });

  it("lets an unallowlisted user link with a valid code", async () => {
    const calls: Array<{ code: string; telegramUserId: string }> = [];
    const reply = await handleIncomingMessage(
      { userId: 999, text: "/link ABC123" },
      options({
        api: fakeApi({
          async linkTelegram(input) {
            calls.push(input);
            return { status: "linked" };
          },
        }),
      }),
    );

    expect(calls).toEqual([{ code: "ABC123", telegramUserId: "999" }]);
    expect(reply).toBe("Telegram connected. Send an expense when ready.");
  });

  it("explains expired or invalid link codes", async () => {
    const reply = await handleIncomingMessage(
      { userId: 999, text: "/link OLD123" },
      options({
        api: fakeApi({
          async linkTelegram() {
            return { status: "invalid_code" };
          },
        }),
      }),
    );

    expect(reply).toBe(
      "Code not recognized or expired. Create a new one in Settings.",
    );
  });

  it("explains already-linked Telegram accounts", async () => {
    const reply = await handleIncomingMessage(
      { userId: 999, text: "/link ABC123" },
      options({
        api: fakeApi({
          async linkTelegram() {
            return { status: "telegram_already_linked" };
          },
        }),
      }),
    );

    expect(reply).toBe("This Telegram account is already connected.");
  });

  it("forwards normal text to the API and returns feedback", async () => {
    const calls: Array<{
      message: string;
      telegramUserId?: string;
      timezone: string;
      defaultCurrency: string;
    }> = [];
    const reply = await handleIncomingMessage(
      { userId: 123, text: "spent 15 eur on food" },
      options({
        api: fakeApi({
          async createFromMessage(input) {
            calls.push(input);
            return {
              feedback: "Logged 15 EUR for Restaurants / Cafes / Fun.",
            };
          },
        }),
      }),
    );

    expect(reply).toBe("Logged 15 EUR for Restaurants / Cafes / Fun.");
    expect(calls).toEqual([
      {
        message: "spent 15 eur on food",
        telegramUserId: "123",
        timezone: "Europe/Lisbon",
        defaultCurrency: "EUR",
      },
    ]);
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

    expect(reply).toBe("Transport 9/18 EUR");
  });

  it("undoes the latest telegram transaction", async () => {
    const reply = await handleIncomingMessage(
      { userId: 123, text: "/undo" },
      options(),
    );

    expect(reply).toBe("Undid 15 EUR: food.");
  });

  it("updates the latest transaction category", async () => {
    const calls: Array<{
      category: string;
      telegramUserId?: string | undefined;
    }> = [];
    const reply = await handleIncomingMessage(
      { userId: 123, text: "/category last fun" },
      options({
        api: fakeApi({
          async updateLastCategory(input) {
            calls.push(input);
            return {
              description: "movie",
              amount: 6.9,
              currency: "EUR",
              category: "Restaurants / Cafes / Fun",
            };
          },
        }),
      }),
    );

    expect(calls).toEqual([
      {
        category: "Restaurants / Cafes / Fun",
        telegramUserId: "123",
      },
    ]);
    expect(reply).toBe("Updated movie to Restaurants / Cafes / Fun.");
  });
});

function options(
  overrides: Partial<{
    api: TrackxApiClient;
  }> = {},
) {
  return {
    allowedUserIds: ["123"],
    api: overrides.api ?? fakeApi(),
    timezone: "Europe/Lisbon",
    defaultCurrency: "EUR",
  };
}

function fakeApi(overrides: Partial<TrackxApiClient> = {}): TrackxApiClient {
  return {
    async linkTelegram() {
      return { status: "linked" };
    },
    async createFromMessage() {
      return {
        feedback: "Logged 15 EUR for Restaurants / Cafes / Fun.",
      };
    },
    async getBudgetStatus() {
      return {
        period: "week",
        currency: "EUR",
        window: {
          start: "2026-06-15T00:00:00.000Z",
          end: "2026-06-22T00:00:00.000Z",
        },
        budgets: [
          {
            category: "Transport",
            period: "week",
            spentAmount: 9,
            limitAmount: 18,
            currency: "EUR",
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
    async updateLastCategory() {
      return {
        description: "food",
        amount: 15,
        currency: "EUR",
        category: "Groceries",
      };
    },
    ...overrides,
  };
}
