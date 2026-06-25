// Owner: apps/webhook. Cloudflare Worker entrypoint for Telegram webhooks.
import { createTrackxApiClient } from "./api-client.js";
import { parseAllowedUserIds, type WebhookEnv } from "./env.js";
import { handleIncomingMessage, type IncomingMessage } from "./handlers.js";
import {
  isWebhookAuthorized,
  readTelegramUpdate,
  sendTelegramMessage,
} from "./telegram.js";

export default {
  async fetch(request: Request, env: WebhookEnv): Promise<Response> {
    const correlationId = crypto.randomUUID();
    const api = createTrackxApiClient(env.API_BASE_URL, env.TRACKX_API_SECRET);

    if (request.method === "GET") {
      return new Response("TrackX Telegram webhook is running.", {
        status: 200,
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed.", { status: 405 });
    }

    if (!isWebhookAuthorized(request, env)) {
      await recordWebhookEvent(api, {
        correlationId,
        eventType: "telegram_webhook_unauthorized",
        status: "failed",
        metadata: {
          hasSecretHeader: request.headers.has(
            "x-telegram-bot-api-secret-token",
          ),
        },
        errorMessage: "Telegram webhook secret mismatch.",
      });
      return new Response("Unauthorized.", { status: 401 });
    }

    try {
      const body = await request.json();
      const { chatId, userId, messageId, text } = readTelegramUpdate(body);

      await recordWebhookEvent(api, {
        correlationId,
        eventType: "telegram_update_received",
        telegramUserId: userId,
        telegramMessageId: messageId,
        rawMessagePreview: text,
      });

      if (chatId === undefined) {
        await recordWebhookEvent(api, {
          correlationId,
          eventType: "telegram_update_ignored",
          status: "ignored",
          telegramUserId: userId,
          telegramMessageId: messageId,
          rawMessagePreview: text,
          metadata: { reason: "missing_chat_id" },
        });
        return new Response("ok", { status: 200 });
      }

      const incoming: IncomingMessage = { correlationId };

      if (userId !== undefined) {
        incoming.userId = userId;
      }

      if (messageId !== undefined) {
        incoming.messageId = messageId;
      }

      if (text !== undefined) {
        incoming.text = text;
      }

      const reply = await handleIncomingMessage(incoming, {
        allowedUserIds: parseAllowedUserIds(
          env.TELEGRAM_ALLOWED_USER_IDS ?? "",
        ),
        api,
        timezone: env.DEFAULT_TIMEZONE,
        defaultCurrency: env.DEFAULT_CURRENCY,
      });

      await sendTelegramMessage(env, chatId, reply);
      await recordWebhookEvent(api, {
        correlationId,
        eventType: "telegram_reply_sent",
        telegramUserId: userId,
        telegramMessageId: messageId,
        rawMessagePreview: text,
        metadata: { replyPreview: preview(reply) },
      });
      return new Response("ok", { status: 200 });
    } catch (error) {
      await recordWebhookEvent(api, {
        correlationId,
        eventType: "telegram_webhook_failed",
        status: "failed",
        errorMessage: error instanceof Error ? error.message : String(error),
      });
      console.error(
        "[webhook] Failed to process Telegram update:",
        error instanceof Error ? error.message : error,
      );

      return new Response("Webhook processing failed.", { status: 500 });
    }
  },
};

type WebhookEventInput = {
  correlationId: string;
  eventType: string;
  status?: "ok" | "ignored" | "failed";
  telegramUserId?: number | undefined;
  telegramMessageId?: number | undefined;
  rawMessagePreview?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
  errorMessage?: string | undefined;
};

async function recordWebhookEvent(
  api: ReturnType<typeof createTrackxApiClient>,
  input: WebhookEventInput,
): Promise<void> {
  try {
    await api.recordSystemEvent({
      correlationId: input.correlationId,
      source: "cloudflare",
      eventType: input.eventType,
      status: input.status,
      telegramUserId:
        input.telegramUserId === undefined
          ? undefined
          : String(input.telegramUserId),
      telegramMessageId:
        input.telegramMessageId === undefined
          ? undefined
          : String(input.telegramMessageId),
      rawMessagePreview: preview(input.rawMessagePreview),
      metadata: input.metadata,
      errorMessage: input.errorMessage,
    });
  } catch (error) {
    console.error(
      "[webhook] Failed to record system event:",
      error instanceof Error ? error.message : error,
    );
  }
}

function preview(value: string | undefined): string | undefined {
  const normalized = value?.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return undefined;
  }

  return normalized.length <= 180
    ? normalized
    : `${normalized.slice(0, 177)}...`;
}
