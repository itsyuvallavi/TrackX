// Owner: packages/config. Tests for service environment parsing contracts.
import { describe, expect, it } from "vitest";
import {
  loadApiConfig,
  loadBotConfig,
  loadCommonConfig,
  loadParserConfig,
  loadWorkerConfig,
  parseAllowedUserIds,
} from "../index.js";

const baseEnv = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/trackx",
  REDIS_URL: "redis://localhost:6379",
  DEFAULT_TIMEZONE: "Europe/Lisbon",
  DEFAULT_CURRENCY: "EUR",
};

describe("loadCommonConfig", () => {
  it("parses shared database, redis, timezone, and currency values", () => {
    expect(loadCommonConfig(baseEnv)).toEqual({
      databaseUrl: "postgresql://postgres:postgres@localhost:5432/trackx",
      redisUrl: "redis://localhost:6379",
      defaultTimezone: "Europe/Lisbon",
      defaultCurrency: "EUR",
    });
  });

  it("applies timezone and currency defaults", () => {
    const config = loadCommonConfig({
      DATABASE_URL: baseEnv.DATABASE_URL,
      REDIS_URL: baseEnv.REDIS_URL,
    });

    expect(config.defaultTimezone).toBe("Europe/Lisbon");
    expect(config.defaultCurrency).toBe("EUR");
  });

  it("rejects invalid currency values", () => {
    expect(() =>
      loadCommonConfig({
        ...baseEnv,
        DEFAULT_CURRENCY: "GBP",
      }),
    ).toThrow();
  });
});

describe("loadApiConfig", () => {
  it("parses API ports and service URLs", () => {
    expect(
      loadApiConfig({
        ...baseEnv,
        API_PORT: "4101",
        API_BASE_URL: "http://localhost:4101",
        PARSER_BASE_URL: "http://localhost:4102",
      }),
    ).toMatchObject({
      apiPort: 4101,
      apiBaseUrl: "http://localhost:4101",
      parserBaseUrl: "http://localhost:4102",
    });
  });

  it("rejects invalid port values", () => {
    expect(() =>
      loadApiConfig({
        ...baseEnv,
        API_PORT: "70000",
      }),
    ).toThrow();
  });
});

describe("loadParserConfig", () => {
  it("treats an empty OpenAI key as missing", () => {
    expect(
      loadParserConfig({
        OPENAI_API_KEY: "",
        PARSER_PORT: "4002",
        DEFAULT_TIMEZONE: "Europe/Lisbon",
        DEFAULT_CURRENCY: "EUR",
      }),
    ).toEqual({
      openAiApiKey: undefined,
      openAiModel: "gpt-4o-mini",
      parserPort: 4002,
      defaultTimezone: "Europe/Lisbon",
      defaultCurrency: "EUR",
    });
  });

  it("allows the parser OpenAI model to be configured", () => {
    expect(
      loadParserConfig({
        OPENAI_API_KEY: "key",
        OPENAI_MODEL: "gpt-4o",
      }),
    ).toMatchObject({
      openAiApiKey: "key",
      openAiModel: "gpt-4o",
    });
  });
});

describe("loadBotConfig", () => {
  it("parses the Telegram allowlist and optional bot token", () => {
    expect(
      loadBotConfig({
        TELEGRAM_BOT_TOKEN: "token",
        TELEGRAM_ALLOWED_USER_IDS: "123, 456, ,789",
        BOT_PORT: "4003",
        API_BASE_URL: "http://localhost:4001",
        DEFAULT_TIMEZONE: "Europe/Lisbon",
        DEFAULT_CURRENCY: "EUR",
      }),
    ).toEqual({
      telegramBotToken: "token",
      telegramAllowedUserIds: ["123", "456", "789"],
      botPort: 4003,
      apiBaseUrl: "http://localhost:4001",
      defaultTimezone: "Europe/Lisbon",
      defaultCurrency: "EUR",
    });
  });

  it("denies all Telegram users by returning an empty allowlist when unset", () => {
    expect(loadBotConfig({}).telegramAllowedUserIds).toEqual([]);
  });
});

describe("loadWorkerConfig", () => {
  it("uses the local Redis URL default", () => {
    expect(loadWorkerConfig({})).toEqual({
      redisUrl: "redis://localhost:6379",
    });
  });
});

describe("parseAllowedUserIds", () => {
  it("trims blanks and preserves ID strings exactly", () => {
    expect(parseAllowedUserIds("001, 002, abc")).toEqual(["001", "002", "abc"]);
  });
});
