// Owner: packages/config. API service environment parser.
import {
  CommonEnvSchema,
  NonEmptyStringSchema,
  OptionalSecretSchema,
  PortSchema,
  UrlSchema,
  currentEnv,
  type EnvSource,
  loadCommonConfig,
} from "./common.js";

export type ApiConfig = ReturnType<typeof loadCommonConfig> & {
  apiPort: number;
  apiBaseUrl: string;
  parserBaseUrl: string;
  openAiApiKey: string | undefined;
  openAiModel: string;
};

const ApiEnvSchema = CommonEnvSchema.extend({
  API_PORT: PortSchema.default(4001),
  API_BASE_URL: UrlSchema.default("http://localhost:4001"),
  PARSER_BASE_URL: UrlSchema.default("http://localhost:4002"),
  OPENAI_API_KEY: OptionalSecretSchema,
  OPENAI_MODEL: NonEmptyStringSchema.default("gpt-4o-mini"),
});

export function loadApiConfig(env: EnvSource = currentEnv()): ApiConfig {
  const parsed = ApiEnvSchema.parse(env);
  const common = loadCommonConfig(env);

  return {
    ...common,
    apiPort: parsed.API_PORT,
    apiBaseUrl: parsed.API_BASE_URL,
    parserBaseUrl: parsed.PARSER_BASE_URL,
    openAiApiKey: parsed.OPENAI_API_KEY,
    openAiModel: parsed.OPENAI_MODEL,
  };
}
