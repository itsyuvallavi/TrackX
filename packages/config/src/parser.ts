// Owner: packages/config. Parser service environment parser.
import { z } from "zod";
import { CurrencySchema, type Currency } from "@trackx/shared";
import {
  NonEmptyStringSchema,
  OptionalSecretSchema,
  PortSchema,
  currentEnv,
  type EnvSource,
} from "./common.js";

export type ParserConfig = {
  openAiApiKey: string | undefined;
  openAiModel: string;
  parserPort: number;
  defaultTimezone: string;
  defaultCurrency: Currency;
};

const ParserEnvSchema = z.object({
  OPENAI_API_KEY: OptionalSecretSchema,
  OPENAI_MODEL: NonEmptyStringSchema.default("gpt-4o-mini"),
  PARSER_PORT: PortSchema.default(4002),
  DEFAULT_TIMEZONE: NonEmptyStringSchema.default("Europe/Lisbon"),
  DEFAULT_CURRENCY: CurrencySchema.default("EUR"),
});

export function loadParserConfig(env: EnvSource = currentEnv()): ParserConfig {
  const parsed = ParserEnvSchema.parse(env);

  return {
    openAiApiKey: parsed.OPENAI_API_KEY,
    openAiModel: parsed.OPENAI_MODEL,
    parserPort: parsed.PARSER_PORT,
    defaultTimezone: parsed.DEFAULT_TIMEZONE,
    defaultCurrency: parsed.DEFAULT_CURRENCY,
  };
}
