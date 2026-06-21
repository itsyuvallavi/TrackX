// Owner: services/api. API from-message natural edit intent tests.
import { describe, expect, it } from "vitest";
import {
  clarificationResponse,
  createHarness,
  foodResponse,
  intentResponse,
  transactionRecord,
} from "./from-message-helpers.js";

describe("from-message edit intent", () => {
  it("updates a recent transaction category from natural chat", async () => {
    const movie = transactionRecord();
    const harness = await createHarness(foodResponse(), {
      seedRecords: [movie],
      intentResult: intentResponse({
        action: "update_transaction_category",
        transactionId: movie.id,
        category: "Restaurants / Cafes / Fun",
        confidence: 0.92,
      }),
    });

    const response = await harness.server.inject({
      method: "POST",
      url: "/transactions/from-message",
      payload: {
        message: "move the movie to fun",
        telegramUserId: "123",
        timezone: "Europe/Lisbon",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      needsClarification: false,
      feedback: "Updated movie from Misc to Restaurants / Cafes / Fun.",
      transactions: [
        {
          id: movie.id,
          category: "Restaurants / Cafes / Fun",
          description: "movie",
        },
      ],
    });
    expect(harness.records[0]?.category).toBe("Restaurants / Cafes / Fun");
    expect(harness.parserMessages).toEqual([]);
    expect(harness.intentMessages).toEqual(["move the movie to fun"]);
  });

  it("falls back to the parser when chat intent is a new transaction", async () => {
    const harness = await createHarness(foodResponse(), {
      seedRecords: [transactionRecord()],
      intentResult: intentResponse({ action: "create_transaction" }),
    });

    const response = await harness.server.inject({
      method: "POST",
      url: "/transactions/from-message",
      payload: {
        message: "spent 15 eur on food",
        telegramUserId: "123",
        timezone: "Europe/Lisbon",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().feedback).toBe(
      "Logged 15 EUR for Restaurants / Cafes / Fun.",
    );
    expect(harness.parserMessages).toEqual(["spent 15 eur on food"]);
  });

  it("asks for clarification before low-confidence category edits", async () => {
    const movie = transactionRecord();
    const harness = await createHarness(foodResponse(), {
      seedRecords: [movie],
      intentResult: intentResponse({
        action: "update_transaction_category",
        transactionId: movie.id,
        category: "Restaurants / Cafes / Fun",
        clarifyingQuestion: "Did you mean the movie transaction?",
        confidence: 0.4,
      }),
    });

    const response = await harness.server.inject({
      method: "POST",
      url: "/transactions/from-message",
      payload: {
        message: "move it to fun",
        telegramUserId: "123",
        timezone: "Europe/Lisbon",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      needsClarification: true,
      feedback: "I need one detail: Did you mean the movie transaction?",
      transactions: [],
    });
    expect(harness.records[0]?.category).toBe("Misc");
    expect(harness.parserMessages).toEqual([]);
  });

  it("does not run edit intent while a clarification is pending", async () => {
    const harness = await createHarness(
      [
        clarificationResponse(),
        {
          confidence: 0.9,
          transactions: [
            {
              amount: 0.89,
              currency: "EUR",
              type: "expense",
              category: "Groceries",
              description: "garlic",
              merchant: null,
              confidence: 0.9,
            },
          ],
          needsClarification: false,
          clarifyingQuestion: null,
          parser: "openai",
        },
      ],
      {
        seedRecords: [transactionRecord()],
        intentResult: new Error("intent should not run"),
      },
    );

    await harness.server.inject({
      method: "POST",
      url: "/transactions/from-message",
      payload: {
        message: "0.89 for garlic",
        telegramUserId: "123",
        timezone: "Europe/Lisbon",
      },
    });
    const second = await harness.server.inject({
      method: "POST",
      url: "/transactions/from-message",
      payload: {
        message: "euro",
        telegramUserId: "123",
        timezone: "Europe/Lisbon",
      },
    });

    expect(second.statusCode).toBe(201);
    expect(second.json().feedback).toBe("Logged 0.89 EUR for Groceries.");
    expect(harness.intentMessages).toEqual(["0.89 for garlic"]);
  });
});
