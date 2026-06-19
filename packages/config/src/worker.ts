// Owner: packages/config. Worker service environment parser.
import { z } from "zod";
import { UrlSchema, currentEnv, type EnvSource } from "./common.js";

export type WorkerConfig = {
  redisUrl: string;
};

const WorkerEnvSchema = z.object({
  REDIS_URL: UrlSchema.default("redis://localhost:6379"),
});

export function loadWorkerConfig(env: EnvSource = currentEnv()): WorkerConfig {
  const parsed = WorkerEnvSchema.parse(env);

  return {
    redisUrl: parsed.REDIS_URL,
  };
}
