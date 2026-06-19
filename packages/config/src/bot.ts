// Owner: packages/config. Telegram bot environment parser and allowlist config.
import { z } from "zod";
import {
  OptionalSecretSchema,
  PortSchema,
  UrlSchema,
  currentEnv,
  type EnvSource,
  parseAllowedUserIds,
} from "./common.js";
import { CurrencySchema, type Currency } from "@trackx/shared";

export type BotConfig = {
  telegramBotToken: string | undefined;
  telegramAllowedUserIds: string[];
  botPort: number;
  apiBaseUrl: string;
  defaultTimezone: string;
  defaultCurrency: Currency;
};

const BotEnvSchema = z.object({
  TELEGRAM_BOT_TOKEN: OptionalSecretSchema,
  TELEGRAM_ALLOWED_USER_IDS: z.string().optional(),
  BOT_PORT: PortSchema.default(4003),
  API_BASE_URL: UrlSchema.default("http://localhost:4001"),
  DEFAULT_TIMEZONE: z.string().trim().min(1).default("Europe/Lisbon"),
  DEFAULT_CURRENCY: CurrencySchema.default("EUR"),
});

export function loadBotConfig(env: EnvSource = currentEnv()): BotConfig {
  const parsed = BotEnvSchema.parse(env);

  return {
    telegramBotToken: parsed.TELEGRAM_BOT_TOKEN,
    telegramAllowedUserIds: parseAllowedUserIds(
      parsed.TELEGRAM_ALLOWED_USER_IDS,
    ),
    botPort: parsed.BOT_PORT,
    apiBaseUrl: parsed.API_BASE_URL,
    defaultTimezone: parsed.DEFAULT_TIMEZONE,
    defaultCurrency: parsed.DEFAULT_CURRENCY,
  };
}
