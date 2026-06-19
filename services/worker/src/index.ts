// Owner: services/worker. Worker service runtime entrypoint.
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { loadWorkerConfig } from "@trackx/config";
import { startWorker } from "./queues.js";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });

function schedulesEnabled(): boolean {
  return process.env.WORKER_ENABLE_SCHEDULES === "true";
}

async function main(): Promise<void> {
  let config;

  try {
    config = loadWorkerConfig();
  } catch (error) {
    console.error(
      "[worker] Invalid configuration:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }

  let runtime;

  try {
    runtime = await startWorker(config, {
      enableSchedules: schedulesEnabled(),
    });
  } catch (error) {
    console.error(
      "[worker] Failed to connect to Redis:",
      error instanceof Error ? error.message : error,
    );
    process.exit(1);
  }

  const shutdown = async (signal: string) => {
    console.info(`[worker] Received ${signal}, shutting down.`);
    await runtime.close();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
  });
}

main().catch((error: unknown) => {
  console.error(
    "[worker] Unexpected startup error:",
    error instanceof Error ? error.message : error,
  );
  process.exit(1);
});
