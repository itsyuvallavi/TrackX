// Owner: apps/webhook. Telegram message and command handling for webhook updates.
import { formatTelegramBudgets, resolveCategoryName } from "@trackx/shared";
import {
  TrackxApiUnauthorizedError,
  type TrackxApiClient,
} from "./api-client.js";

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
  const text = message.text?.trim();

  if (!text) {
    return helpText();
  }

  if (isPublicCommand(text)) {
    return handleCommand(text, message, options);
  }

  if (text.startsWith("/")) {
    return handleCommand(text, message, options);
  }

  return protectedApiCall(async () => {
    const response = await options.api.createFromMessage({
      message: text,
      telegramUserId: telegramUserId(message),
      timezone: options.timezone,
      defaultCurrency: options.defaultCurrency,
    });

    return response.feedback;
  });
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

  if (name === "/link") {
    return linkTelegramAccount(command, message, options);
  }

  if (name === "/undo") {
    return protectedApiCall(async () => {
      const transaction = await options.api.undoLast({
        telegramUserId: telegramUserId(message),
      });
      return `Undid ${transaction.amount} ${transaction.currency}: ${transaction.description}.`;
    });
  }

  if (name === "/category") {
    return updateLastCategory(command, message, options);
  }

  if (name === "/week" || name === "/budgets") {
    return protectedApiCall(async () =>
      formatBudgets(
        await options.api.getBudgetStatus({
          period: "week",
          telegramUserId: telegramUserId(message),
        }),
      ),
    );
  }

  if (name === "/month" || name === "/summary") {
    return protectedApiCall(async () => {
      const dashboard = await options.api.getMonthDashboard({
        telegramUserId: telegramUserId(message),
      });
      return `Month: ${dashboard.expenses} ${dashboard.currency} spent, ${dashboard.income} ${dashboard.currency} income, ${dashboard.net} ${dashboard.currency} net.`;
    });
  }

  return helpText();
}

export function helpText(): string {
  return [
    "Send expenses or income in normal language.",
    "Examples:",
    "spent 15 eur on food",
    "earned 200 dollars",
    "Commands: /link CODE, /week, /month, /budgets, /undo, /category last <category>, /help",
  ].join("\n");
}

function isPublicCommand(text: string): boolean {
  const [name] = text.split(/\s+/);
  return name === "/start" || name === "/help" || name === "/link";
}

async function linkTelegramAccount(
  command: string,
  message: IncomingMessage,
  options: HandlerOptions,
): Promise<string> {
  const [, code] = command.trim().split(/\s+/, 2);
  const userId = telegramUserId(message);

  if (!userId) {
    return "Open TrackX from your Telegram account, then send /link CODE.";
  }

  if (!code) {
    return "Send /link CODE from TrackX Settings.";
  }

  const result = await options.api.linkTelegram({
    code,
    telegramUserId: userId,
  });

  if (result.status === "linked") {
    return "Telegram connected. Send an expense when ready.";
  }

  if (result.status === "telegram_already_linked") {
    return "This Telegram account is already connected.";
  }

  return "Code not recognized or expired. Create a new one in Settings.";
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

  return protectedApiCall(async () => {
    const transaction = await options.api.updateLastCategory({
      category,
      telegramUserId: telegramUserId(message),
    });

    return `Updated ${transaction.description} to ${category}.`;
  });
}

function formatBudgets(
  response: Awaited<ReturnType<TrackxApiClient["getBudgetStatus"]>>,
): string {
  return formatTelegramBudgets(response.budgets);
}

async function protectedApiCall(
  operation: () => Promise<string>,
): Promise<string> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof TrackxApiUnauthorizedError) {
      return "Connect Telegram in TrackX Settings first.";
    }

    throw error;
  }
}
