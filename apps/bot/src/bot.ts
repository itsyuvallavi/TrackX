// Owner: apps/bot. Telegraf bot construction and handler registration.
import { Telegraf } from "telegraf";
import type { BotConfig } from "@trackx/config";
import type { TrackxApiClient } from "./api-client.js";
import { handleCommand, handleTextMessage } from "./commands.js";

export type BuildTrackxBotOptions = {
  config: BotConfig;
  api: TrackxApiClient;
  timezone: string;
  defaultCurrency: string;
};

export function buildTrackxBot(options: BuildTrackxBotOptions): Telegraf {
  if (!options.config.telegramBotToken) {
    throw new Error("TELEGRAM_BOT_TOKEN is required to start the bot.");
  }

  const bot = new Telegraf(options.config.telegramBotToken);
  const commandOptions = {
    allowedUserIds: options.config.telegramAllowedUserIds,
    api: options.api,
    timezone: options.timezone,
    defaultCurrency: options.defaultCurrency,
  };

  bot.start((ctx) => handleCommand(ctx, commandOptions, "/start"));
  bot.help((ctx) => handleCommand(ctx, commandOptions, "/help"));
  bot.command("undo", (ctx) => handleCommand(ctx, commandOptions, "/undo"));
  bot.command("category", (ctx) =>
    handleCommand(ctx, commandOptions, ctx.message.text),
  );
  bot.command("week", (ctx) => handleCommand(ctx, commandOptions, "/week"));
  bot.command("month", (ctx) => handleCommand(ctx, commandOptions, "/month"));
  bot.command("summary", (ctx) =>
    handleCommand(ctx, commandOptions, "/summary"),
  );
  bot.command("budgets", (ctx) =>
    handleCommand(ctx, commandOptions, "/budgets"),
  );
  bot.on("text", (ctx) => handleTextMessage(ctx, commandOptions));

  return bot;
}
