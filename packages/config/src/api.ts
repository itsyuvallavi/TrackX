// Owner: packages/config. API service environment parser.
import {
  CommonEnvSchema,
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
};

const ApiEnvSchema = CommonEnvSchema.extend({
  API_PORT: PortSchema.default(4001),
  API_BASE_URL: UrlSchema.default("http://localhost:4001"),
  PARSER_BASE_URL: UrlSchema.default("http://localhost:4002"),
});

export function loadApiConfig(env: EnvSource = currentEnv()): ApiConfig {
  const parsed = ApiEnvSchema.parse(env);
  const common = loadCommonConfig(env);

  return {
    ...common,
    apiPort: parsed.API_PORT,
    apiBaseUrl: parsed.API_BASE_URL,
    parserBaseUrl: parsed.PARSER_BASE_URL,
  };
}
