// Owner: packages/config. Shared env parsing primitives and common TrackX settings.
import { CurrencySchema, type Currency } from "@trackx/shared";
import { z } from "zod";

export type EnvSource = Record<string, string | undefined>;

declare const process: { env: EnvSource } | undefined;

export type CommonConfig = {
  databaseUrl: string;
  redisUrl: string;
  defaultTimezone: string;
  defaultCurrency: Currency;
};

export const NonEmptyStringSchema = z.string().trim().min(1);

export const OptionalSecretSchema = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? undefined : value,
  z.string().trim().min(1).optional(),
);

export const PortSchema = z.coerce.number().int().min(1).max(65_535);

export const UrlSchema = z.string().trim().url();

export const CommonEnvSchema = z.object({
  DATABASE_URL: UrlSchema,
  REDIS_URL: UrlSchema,
  DEFAULT_TIMEZONE: NonEmptyStringSchema.default("Europe/Lisbon"),
  DEFAULT_CURRENCY: CurrencySchema.default("EUR"),
});

export function currentEnv(): EnvSource {
  return typeof process === "undefined" ? {} : process.env;
}

export function loadCommonConfig(env: EnvSource = currentEnv()): CommonConfig {
  const parsed = CommonEnvSchema.parse(env);

  return {
    databaseUrl: parsed.DATABASE_URL,
    redisUrl: parsed.REDIS_URL,
    defaultTimezone: parsed.DEFAULT_TIMEZONE,
    defaultCurrency: parsed.DEFAULT_CURRENCY,
  };
}

export function parseAllowedUserIds(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}
