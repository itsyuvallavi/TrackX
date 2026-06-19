// Owner: apps/bot. Fastify health server for local bot runtime.
import Fastify, { type FastifyInstance } from "fastify";
import type { BotConfig } from "@trackx/config";

export async function buildBotServer(
  config: BotConfig,
): Promise<FastifyInstance> {
  const server = Fastify({ logger: false });

  server.get("/health", async () => ({
    ok: true,
    service: "bot",
    telegramConfigured: Boolean(config.telegramBotToken),
    allowedUsers: config.telegramAllowedUserIds.length,
  }));

  return server;
}
