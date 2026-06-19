// Owner: services/parser. Route tests for parser service request and response boundaries.
import { describe, expect, it } from "vitest";
import { buildParserServer } from "../server.js";

const config = {
  openAiApiKey: "test-key",
  openAiModel: "gpt-4o-mini",
  parserPort: 4002,
  defaultTimezone: "Europe/Lisbon",
  defaultCurrency: "EUR" as const,
};

describe("parser routes", () => {
  it("serves health checks", async () => {
    const server = await buildParserServer({
      config,
      parseTransaction: async () => ({
        confidence: 1,
        transactions: [],
        needsClarification: true,
        clarifyingQuestion: "What amount?",
        parser: "openai",
      }),
    });

    const response = await server.inject({ method: "GET", url: "/health" });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true, service: "parser" });
  });

  it("validates and parses transaction requests", async () => {
    const server = await buildParserServer({
      config,
      parseTransaction: async () => ({
        confidence: 0.9,
        transactions: [
          {
            amount: 15,
            currency: "EUR",
            type: "expense",
            category: "Restaurants / Cafes / Fun",
            description: "food",
            merchant: null,
            confidence: 0.9,
          },
        ],
        needsClarification: false,
        clarifyingQuestion: null,
        parser: "openai",
      }),
    });

    const response = await server.inject({
      method: "POST",
      url: "/parse-transaction",
      payload: {
        message: "spent 15 eur on food",
        timezone: "Europe/Lisbon",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().transactions).toHaveLength(1);
  });

  it("returns 400 for invalid parser requests", async () => {
    const server = await buildParserServer({
      config,
      parseTransaction: async () => {
        throw new Error("should not parse invalid requests");
      },
    });

    const response = await server.inject({
      method: "POST",
      url: "/parse-transaction",
      payload: { timezone: "Europe/Lisbon" },
    });

    expect(response.statusCode).toBe(400);
  });

  it("returns 503 when OpenAI is not configured", async () => {
    const server = await buildParserServer({
      config: { ...config, openAiApiKey: undefined },
      parseTransaction: null,
    });

    const response = await server.inject({
      method: "POST",
      url: "/parse-transaction",
      payload: {
        message: "spent 15 eur on food",
        timezone: "Europe/Lisbon",
      },
    });

    expect(response.statusCode).toBe(503);
  });

  it("returns 502 if the parser implementation returns invalid output", async () => {
    const server = await buildParserServer({
      config,
      parseTransaction: async () => ({ unexpected: true }) as never,
    });

    const response = await server.inject({
      method: "POST",
      url: "/parse-transaction",
      payload: {
        message: "spent 15 eur on food",
        timezone: "Europe/Lisbon",
      },
    });

    expect(response.statusCode).toBe(502);
  });
});
