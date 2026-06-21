// Owner: packages/parser-core. Tests for OpenAI parser normalization without live API calls.
import { describe, expect, it } from "vitest";
import {
  parseTransactionWithOpenAi,
  type OpenAiResponsesClient,
} from "../openai-parser.js";

const config = {
  apiKey: "test-key",
  model: "gpt-4o-mini",
};

function clientWithOutput(
  output: unknown,
  onInput?: (input: Record<string, unknown>) => void,
): OpenAiResponsesClient {
  return {
    responses: {
      async create(input) {
        onInput?.(input);
        return { output_text: JSON.stringify(output) };
      },
    },
  };
}

describe("parseTransactionWithOpenAi", () => {
  it("returns one expense for a simple food message", async () => {
    const response = await parseTransactionWithOpenAi(
      { message: "spent 15 eur on food", timezone: "Europe/Lisbon" },
      config,
      clientWithOutput({
        confidence: 0.9,
        transactions: [
          expense(15, "EUR", "Restaurants / Cafes / Fun", "food", null),
        ],
        needsClarification: false,
        clarifyingQuestion: null,
        parser: "openai",
      }),
    );

    expect(response.transactions).toHaveLength(1);
    expect(response.transactions[0]).toMatchObject({
      amount: 15,
      type: "expense",
      category: "Restaurants / Cafes / Fun",
    });
  });

  it("maps bus expenses to Transport", async () => {
    const response = await parseTransactionWithOpenAi(
      { message: "spent 2.3 euro on bus", timezone: "Europe/Lisbon" },
      config,
      clientWithOutput({
        confidence: 0.94,
        transactions: [expense(2.3, "EUR", "Transport", "bus", null)],
        needsClarification: false,
        clarifyingQuestion: null,
        parser: "openai",
      }),
    );

    expect(response.transactions[0]?.category).toBe("Transport");
  });

  it("returns income for earned messages", async () => {
    const response = await parseTransactionWithOpenAi(
      { message: "earned 200 dollars", timezone: "Europe/Lisbon" },
      config,
      clientWithOutput({
        confidence: 0.92,
        transactions: [
          {
            amount: 200,
            currency: "USD",
            type: "income",
            category: "Income",
            description: "earned",
            merchant: null,
            confidence: 0.92,
          },
        ],
        needsClarification: false,
        clarifyingQuestion: null,
        parser: "openai",
      }),
    );

    expect(response.transactions[0]).toMatchObject({
      amount: 200,
      currency: "USD",
      type: "income",
      category: "Income",
    });
  });

  it("returns two expenses for a parenthesized split message", async () => {
    const response = await parseTransactionWithOpenAi(
      {
        message: "spent 50 eu on wipes (20eu) and new coffee maker (30eu)",
        timezone: "Europe/Lisbon",
      },
      config,
      clientWithOutput({
        confidence: 0.9,
        transactions: [
          expense(20, "EUR", "Home", "wipes", null),
          expense(
            30,
            "EUR",
            "Restaurants / Cafes / Fun",
            "new coffee maker",
            null,
          ),
        ],
        needsClarification: false,
        clarifyingQuestion: null,
        parser: "openai",
      }),
    );

    expect(response.transactions).toHaveLength(2);
    expect(
      response.transactions.map((transaction) => transaction.amount),
    ).toEqual([20, 30]);
  });

  it("accepts clarification responses with no transactions", async () => {
    const response = await parseTransactionWithOpenAi(
      { message: "spent 15 on food", timezone: "Europe/Lisbon" },
      config,
      clientWithOutput({
        confidence: 0.8,
        transactions: [],
        needsClarification: true,
        clarifyingQuestion: "Which currency did you use?",
        parser: "openai",
      }),
    );

    expect(response.needsClarification).toBe(true);
    expect(response.transactions).toEqual([]);
  });

  it("accepts missing amount clarification responses", async () => {
    const response = await parseTransactionWithOpenAi(
      { message: "spent eur on groceries", timezone: "Europe/Lisbon" },
      config,
      clientWithOutput({
        confidence: 0.8,
        transactions: [],
        needsClarification: true,
        clarifyingQuestion: "What amount did you spend?",
        parser: "openai",
      }),
    );

    expect(response.needsClarification).toBe(true);
    expect(response.clarifyingQuestion).toContain("amount");
  });

  it("requests deterministic OpenAI output", async () => {
    let capturedInput: Record<string, unknown> | null = null;

    await parseTransactionWithOpenAi(
      { message: "spent 15 eur on food", timezone: "Europe/Lisbon" },
      config,
      clientWithOutput(
        {
          confidence: 0.9,
          transactions: [
            expense(15, "EUR", "Restaurants / Cafes / Fun", "food", null),
          ],
          needsClarification: false,
          clarifyingQuestion: null,
          parser: "openai",
        },
        (input) => {
          capturedInput = input;
        },
      ),
    );

    expect(capturedInput).toMatchObject({ temperature: 0 });
  });
});

function expense(
  amount: number,
  currency: "EUR" | "USD" | "ILS",
  category: "Restaurants / Cafes / Fun" | "Transport" | "Home",
  description: string,
  merchant: string | null,
) {
  return {
    amount,
    currency,
    type: "expense",
    category,
    description,
    merchant,
    confidence: 0.9,
  };
}
