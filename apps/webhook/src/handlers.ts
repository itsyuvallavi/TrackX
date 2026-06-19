// Owner: apps/webhook. Telegram message and command handling for webhook updates.
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
    return handleCommand(text, options);
  }

  const response = await options.api.createFromMessage({
    message: text,
    timezone: options.timezone,
    defaultCurrency: options.defaultCurrency,
  });

  return response.feedback;
}

export async function handleCommand(
  command: string,
  options: HandlerOptions,
): Promise<string> {
  const [name] = command.split(/\s+/);

  if (name === "/start" || name === "/help") {
    return helpText();
  }

  if (name === "/undo") {
    const transaction = await options.api.undoLast();
    return `Undid ${transaction.amount} ${transaction.currency}: ${transaction.description}.`;
  }

  if (name === "/week" || name === "/budgets") {
    return formatBudgets(await options.api.getBudgetStatus("week"));
  }

  if (name === "/month" || name === "/summary") {
    const dashboard = await options.api.getMonthDashboard();
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
    "Commands: /week, /month, /budgets, /undo, /help",
  ].join("\n");
}

function formatBudgets(
  response: Awaited<ReturnType<TrackxApiClient["getBudgetStatus"]>>,
): string {
  const lines = response.budgets
    .slice(0, 8)
    .map(
      (budget) =>
        `${budget.category}: ${budget.spentAmount}/${budget.limitAmount} ${budget.currency} (${budget.status})`,
    );

  return lines.length > 0 ? lines.join("\n") : "No budgets found.";
}
