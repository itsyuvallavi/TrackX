// Owner: apps/bot. Telegram bot service runtime entrypoint.
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { loadBotConfig } from "@trackx/config";
import { createTrackxApiClient } from "./api-client.js";
import { buildTrackxBot } from "./bot.js";
import { buildBotServer } from "./server.js";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });

const botConfig = loadBotConfig();
const api = createTrackxApiClient(botConfig.apiBaseUrl);
const bot = buildTrackxBot({
  config: botConfig,
  api,
  timezone: botConfig.defaultTimezone,
  defaultCurrency: botConfig.defaultCurrency,
});
const server = await buildBotServer(botConfig);

await server.listen({
  port: botConfig.botPort,
  host: "0.0.0.0",
});
await bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
