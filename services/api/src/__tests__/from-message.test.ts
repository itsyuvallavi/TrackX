// Owner: services/api. API from-message route tests with mocked parser output.
import { describe, expect, it } from "vitest";
import {
  clarificationResponse,
  createHarness,
  foodResponse,
  incomeResponse,
  splitResponse,
} from "./from-message-helpers.js";

describe("from-message route", () => {
  it("creates one transaction from parser output", async () => {
    const harness = await createHarness(foodResponse());

    const response = await harness.server.inject({
      method: "POST",
      url: "/transactions/from-message",
      payload: {
        message: "spent 15 eur on food",
        timezone: "Europe/Lisbon",
        defaultCurrency: "EUR",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      needsClarification: false,
      feedback: "Logged 15 EUR for Restaurants / Cafes / Fun.",
      transactions: [
        {
          amount: 15,
          currency: "EUR",
          category: "Restaurants / Cafes / Fun",
          rawMessage: "spent 15 eur on food",
          source: "telegram",
        },
      ],
    });
    expect(harness.parseEvents).toHaveLength(1);
    expect(harness.parseEvents[0]?.status).toBe("success");
  });

  it("uses a category override for weak parser output", async () => {
    const parserResult = foodResponse();
    parserResult.transactions[0]!.amount = 3;
    parserResult.transactions[0]!.category = "Misc";
    parserResult.transactions[0]!.confidence = 0.2;
    parserResult.transactions[0]!.description = "Melbourne Elouera";
    parserResult.transactions[0]!.merchant = "Melbourne Elouera";
    const harness = await createHarness(parserResult);

    const response = await harness.server.inject({
      method: "POST",
      url: "/transactions/from-message",
      payload: {
        message: "3 eur for Melbourne Elouera",
        timezone: "Europe/Lisbon",
        defaultCurrency: "EUR",
        categoryOverride: "Restaurants / Cafes / Fun",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().transactions).toMatchObject([
      {
        amount: 3,
        category: "Restaurants / Cafes / Fun",
        rawMessage: "3 eur for Melbourne Elouera",
      },
    ]);
  });

  it("does not let an import category override a confident parser category", async () => {
    const parserResult = foodResponse();
    parserResult.transactions[0]!.amount = 4.56;
    parserResult.transactions[0]!.category = "Restaurants / Cafes / Fun";
    parserResult.transactions[0]!.confidence = 0.98;
    parserResult.transactions[0]!.description = "Too Good To Go";
    parserResult.transactions[0]!.merchant = "Too Good To Go";
    const harness = await createHarness(parserResult);

    const response = await harness.server.inject({
      method: "POST",
      url: "/transactions/from-message",
      payload: {
        message: "4.56 eur for Too Good To Go",
        timezone: "Europe/Lisbon",
        defaultCurrency: "EUR",
        categoryOverride: "Shopping",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().transactions).toMatchObject([
      {
        amount: 4.56,
        category: "Restaurants / Cafes / Fun",
        rawMessage: "4.56 eur for Too Good To Go",
      },
    ]);
  });

  it("accepts timezone values with hidden whitespace", async () => {
    const harness = await createHarness(foodResponse());

    const response = await harness.server.inject({
      method: "POST",
      url: "/transactions/from-message",
      payload: {
        message: "spent 15 eur on food",
        timezone: "Europe/Lisbon\n",
        defaultCurrency: "EUR",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().transactions).toMatchObject([
      {
        amount: 15,
        currency: "EUR",
        category: "Restaurants / Cafes / Fun",
      },
    ]);
    expect(harness.records).toHaveLength(1);
    expect(harness.parseEvents[0]?.status).toBe("success");
  });

  it("adds budget warnings to successful transaction feedback", async () => {
    const harness = await createHarness(foodResponse(), {
      budgetWarnings: ["Heads up: Food & fun 39/50 EUR used."],
    });

    const response = await harness.server.inject({
      method: "POST",
      url: "/transactions/from-message",
      payload: {
        message: "spent 15 eur on food",
        timezone: "Europe/Lisbon",
        defaultCurrency: "EUR",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().feedback).toBe(
      [
        "Logged 15 EUR for Restaurants / Cafes / Fun.",
        "Heads up: Food & fun 39/50 EUR used.",
      ].join("\n"),
    );
  });

  it("creates split transactions from one message", async () => {
    const harness = await createHarness(splitResponse());
    const response = await harness.server.inject({
      method: "POST",
      url: "/transactions/from-message",
      payload: {
        message: "spent 50 eu on wipes (20eu) and new coffee maker (30eu)",
        timezone: "Europe/Lisbon",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().transactions).toMatchObject([
      { amount: 20, category: "Home", description: "wipes" },
      { amount: 30, category: "Home", description: "new coffee maker" },
    ]);
    expect(response.json().feedback).toBe(
      "Logged 2 transactions totaling 50 EUR.",
    );
  });

  it("creates income transactions", async () => {
    const harness = await createHarness(incomeResponse());
    const response = await harness.server.inject({
      method: "POST",
      url: "/transactions/from-message",
      payload: {
        message: "earned 200 dollars",
        timezone: "Europe/Lisbon",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().transactions).toMatchObject([
      {
        amount: 200,
        currency: "USD",
        type: "income",
        category: "Income",
      },
    ]);
  });

  it("stores EUR-normalized amounts for USD parser output", async () => {
    const harness = await createHarness(incomeResponse(), {
      exchangeRates: {
        async normalize(input) {
          return {
            amountEur: input.currency === "USD" ? 172 : input.amount,
            amountUsd: input.currency === "USD" ? input.amount : null,
          };
        },
      },
    });
    const response = await harness.server.inject({
      method: "POST",
      url: "/transactions/from-message",
      payload: {
        message: "earned 200 dollars",
        timezone: "Europe/Lisbon",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().transactions).toMatchObject([
      {
        amount: 200,
        currency: "USD",
        amountEur: 172,
        amountUsd: 200,
      },
    ]);
    expect(response.json().feedback).toBe(
      "Logged 172 EUR (200 USD) for Income.",
    );
  });

  it("stores clarification events without creating transactions", async () => {
    const harness = await createHarness(clarificationResponse());
    const response = await harness.server.inject({
      method: "POST",
      url: "/transactions/from-message",
      payload: {
        message: "spent on food",
        timezone: "Europe/Lisbon",
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      transactions: [],
      needsClarification: true,
      clarifyingQuestion: "What amount and currency was this?",
      feedback: "I need one detail: What amount and currency was this?",
    });
    expect(harness.records).toHaveLength(0);
    expect(harness.parseEvents[0]?.status).toBe("clarification");
  });

  it("uses a pending clarification to complete the original message", async () => {
    const harness = await createHarness([
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
    ]);

    const first = await harness.server.inject({
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

    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(second.json()).toMatchObject({
      needsClarification: false,
      feedback: "Logged 0.89 EUR for Groceries.",
      transactions: [
        {
          amount: 0.89,
          currency: "EUR",
          category: "Groceries",
          rawMessage: "0.89 for garlic",
        },
      ],
    });
    expect(harness.parserMessages).toEqual([
      "0.89 for garlic",
      "Original message: 0.89 for garlic. Clarification answer: euro.",
    ]);
    expect(harness.pendingClarifications).toMatchObject([
      {
        originalMessage: "0.89 for garlic",
        telegramUserId: "123",
        status: "resolved",
      },
    ]);
  });

  it("stores failure events when parser fails", async () => {
    const harness = await createHarness(new Error("parser unavailable"));
    const response = await harness.server.inject({
      method: "POST",
      url: "/transactions/from-message",
      payload: {
        message: "spent 15 eur on food",
        timezone: "Europe/Lisbon",
      },
    });

    expect(response.statusCode).toBe(500);
    expect(harness.records).toHaveLength(0);
    expect(harness.parseEvents[0]?.status).toBe("failure");
  });
});
