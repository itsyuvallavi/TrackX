// Owner: apps/bot. Telegram command and text handlers for TrackX.
import { resolveCategoryName } from "@trackx/shared";
import type { TrackxApiClient } from "./api-client.js";
import { deniedMessage, isTelegramUserAllowed } from "./allowlist.js";

export type BotContext = {
  from?: { id: number };
  message?: { text?: string };
  reply(message: string): Promise<unknown>;
};

export type CommandHandlerOptions = {
  allowedUserIds: readonly string[];
  api: TrackxApiClient;
  timezone: string;
  defaultCurrency: string;
};

export async function handleTextMessage(
  ctx: BotContext,
  options: CommandHandlerOptions,
): Promise<void> {
  if (!(await ensureAllowed(ctx, options.allowedUserIds))) {
    return;
  }

  const text = ctx.message?.text?.trim();

  if (!text) {
    await ctx.reply(helpText());
    return;
  }

  if (text.startsWith("/")) {
    await handleCommand(ctx, options, text);
    return;
  }

  const response = await options.api.createFromMessage({
    message: text,
    telegramUserId: telegramUserId(ctx),
    timezone: options.timezone,
    defaultCurrency: options.defaultCurrency,
  });

  await ctx.reply(response.feedback);
}

export async function handleCommand(
  ctx: BotContext,
  options: CommandHandlerOptions,
  command: string,
): Promise<void> {
  if (!(await ensureAllowed(ctx, options.allowedUserIds))) {
    return;
  }

  const [name] = command.split(/\s+/);

  if (name === "/start" || name === "/help") {
    await ctx.reply(helpText());
    return;
  }

  if (name === "/undo") {
    const transaction = await options.api.undoLast({
      telegramUserId: telegramUserId(ctx),
    });
    await ctx.reply(
      `Undid ${transaction.amount} ${transaction.currency}: ${transaction.description}.`,
    );
    return;
  }

  if (name === "/category") {
    await replyWithCategoryUpdate(ctx, options, command);
    return;
  }

  if (name === "/week" || name === "/budgets") {
    await replyWithBudgets(ctx, await options.api.getBudgetStatus("week"));
    return;
  }

  if (name === "/month" || name === "/summary") {
    const dashboard = await options.api.getMonthDashboard();
    await ctx.reply(
      `Month: ${dashboard.expenses} ${dashboard.currency} spent, ${dashboard.income} ${dashboard.currency} income, ${dashboard.net} ${dashboard.currency} net.`,
    );
    return;
  }

  await ctx.reply(helpText());
}

export function helpText(): string {
  return [
    "Send expenses or income in normal language.",
    "Examples:",
    "spent 15 eur on food",
    "earned 200 dollars",
    "Commands: /week, /month, /budgets, /undo, /category last <category>, /help",
  ].join("\n");
}

function telegramUserId(ctx: BotContext): string | undefined {
  return ctx.from?.id === undefined ? undefined : String(ctx.from.id);
}

async function ensureAllowed(
  ctx: BotContext,
  allowedUserIds: readonly string[],
): Promise<boolean> {
  const decision = isTelegramUserAllowed(ctx.from?.id, allowedUserIds);

  if (!decision.allowed) {
    await ctx.reply(deniedMessage(decision));
    return false;
  }

  return true;
}

async function replyWithCategoryUpdate(
  ctx: BotContext,
  options: CommandHandlerOptions,
  command: string,
): Promise<void> {
  const match = /^\/category\s+last\s+(.+)$/i.exec(command.trim());

  if (!match) {
    await ctx.reply("Use: /category last <category>");
    return;
  }

  const category = resolveCategoryName(match[1] ?? "");

  if (!category) {
    await ctx.reply("I do not recognize that category.");
    return;
  }

  const transaction = await options.api.updateLastCategory({
    category,
    telegramUserId: telegramUserId(ctx),
  });

  await ctx.reply(`Updated ${transaction.description} to ${category}.`);
}

async function replyWithBudgets(
  ctx: BotContext,
  response: Awaited<ReturnType<TrackxApiClient["getBudgetStatus"]>>,
): Promise<void> {
  const lines = response.budgets
    .slice(0, 8)
    .map(
      (budget) =>
        `${budget.category}: ${budget.spentAmount}/${budget.limitAmount} ${budget.currency} (${budget.status})`,
    );

  await ctx.reply(lines.length > 0 ? lines.join("\n") : "No budgets found.");
}
