// Owner: apps/webhook. Telegram message and command handling for webhook updates.
import { formatTelegramBudgets, resolveCategoryName } from "@trackx/shared";
import type { TrackxApiClient } from "./api-client.js";
import { deniedMessage, isTelegramUserAllowed } from "./allowlist.js";

export type HandlerOptions = {
  allowedUserIds: readonly string[];
  api: TrackxApiClient;
  timezone: string;
  defaultCurrency: string;
};

export type IncomingMessage = {
  userId?: number | undefined;
  text?: string | undefined;
};

export async function handleIncomingMessage(
  message: IncomingMessage,
  options: HandlerOptions,
): Promise<string> {
  const decision = isTelegramUserAllowed(
    message.userId,
    options.allowedUserIds,
  );

  if (!decision.allowed) {
    return deniedMessage(decision);
  }

  const text = message.text?.trim();

  if (!text) {
    return helpText();
  }

  if (text.startsWith("/")) {
    return handleCommand(text, message, options);
  }

  const response = await options.api.createFromMessage({
    message: text,
    telegramUserId: telegramUserId(message),
    timezone: options.timezone,
    defaultCurrency: options.defaultCurrency,
  });

  return response.feedback;
}

function telegramUserId(message: IncomingMessage): string | undefined {
  return message.userId === undefined ? undefined : String(message.userId);
}

export async function handleCommand(
  command: string,
  message: IncomingMessage,
  options: HandlerOptions,
): Promise<string> {
  const [name] = command.split(/\s+/);

  if (name === "/start" || name === "/help") {
    return helpText();
  }

  if (name === "/undo") {
    const transaction = await options.api.undoLast({
      telegramUserId: telegramUserId(message),
    });
    return `Undid ${transaction.amount} ${transaction.currency}: ${transaction.description}.`;
  }

  if (name === "/category") {
    return updateLastCategory(command, message, options);
  }

  if (name === "/week" || name === "/budgets") {
    return formatBudgets(
      await options.api.getBudgetStatus({
        period: "week",
        telegramUserId: telegramUserId(message),
      }),
    );
  }

  if (name === "/month" || name === "/summary") {
    const dashboard = await options.api.getMonthDashboard({
      telegramUserId: telegramUserId(message),
    });
    return `Month: ${dashboard.expenses} ${dashboard.currency} spent, ${dashboard.income} ${dashboard.currency} income, ${dashboard.net} ${dashboard.currency} net.`;
  }

  return helpText();
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

async function updateLastCategory(
  command: string,
  message: IncomingMessage,
  options: HandlerOptions,
): Promise<string> {
  const match = /^\/category\s+last\s+(.+)$/i.exec(command.trim());

  if (!match) {
    return "Use: /category last <category>";
  }

  const category = resolveCategoryName(match[1] ?? "");

  if (!category) {
    return "I do not recognize that category.";
  }

  const transaction = await options.api.updateLastCategory({
    category,
    telegramUserId: telegramUserId(message),
  });

  return `Updated ${transaction.description} to ${category}.`;
}

function formatBudgets(
  response: Awaited<ReturnType<TrackxApiClient["getBudgetStatus"]>>,
): string {
  return formatTelegramBudgets(response.budgets);
}
