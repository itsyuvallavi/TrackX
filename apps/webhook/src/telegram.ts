// Owner: apps/webhook. Telegram Bot API helpers for webhook replies.
import type { WebhookEnv } from "./env.js";

export type TelegramUpdate = {
  message?: {
    message_id?: number;
    from?: { id?: number };
    chat?: { id?: number };
    text?: string;
  };
};

export function readTelegramUpdate(body: unknown): {
  chatId?: number | undefined;
  userId?: number | undefined;
  messageId?: number | undefined;
  text?: string | undefined;
} {
  const update = body as TelegramUpdate;
  const message = update.message;
  const result: {
    chatId?: number | undefined;
    userId?: number | undefined;
    messageId?: number | undefined;
    text?: string | undefined;
  } = {};

  if (message?.chat?.id !== undefined) {
    result.chatId = message.chat.id;
  }

  if (message?.from?.id !== undefined) {
    result.userId = message.from.id;
  }

  if (message?.message_id !== undefined) {
    result.messageId = message.message_id;
  }

  if (message?.text !== undefined) {
    result.text = message.text;
  }

  return result;
}

export async function sendTelegramMessage(
  env: WebhookEnv,
  chatId: number,
  text: string,
): Promise<void> {
  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Telegram sendMessage returned ${response.status}.`);
  }
}

export function isWebhookAuthorized(
  request: Request,
  env: WebhookEnv,
): boolean {
  const expected = env.TELEGRAM_WEBHOOK_SECRET;

  if (!expected) {
    return true;
  }

  return request.headers.get("x-telegram-bot-api-secret-token") === expected;
}
