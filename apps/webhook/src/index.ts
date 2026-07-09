// Owner: apps/webhook. Cloudflare Worker entrypoint for Telegram webhooks.
import { createTrackxApiClient } from "./api-client.js";
import { sendBetterStackLog } from "@trackx/shared";
import { parseAllowedUserIds, type WebhookEnv } from "./env.js";
import { handleIncomingMessage, type IncomingMessage } from "./handlers.js";
import {
  isWebhookAuthorized,
  readTelegramUpdate,
  sendTelegramMessage,
} from "./telegram.js";

export default {
  async fetch(
    request: Request,
    env: WebhookEnv,
    ctx?: ExecutionContext,
  ): Promise<Response> {
    const startedAt = Date.now();
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
      await scheduleWebhookEvent(ctx, recordWebhookEvent(api, env, {
        correlationId,
        eventType: "telegram_webhook_unauthorized",
        status: "failed",
        metadata: {
          elapsedMs: elapsedSince(startedAt),
          hasSecretHeader: request.headers.has(
            "x-telegram-bot-api-secret-token",
          ),
        },
        errorMessage: "Telegram webhook secret mismatch.",
      }));
      return new Response("Unauthorized.", { status: 401 });
    }

    try {
      const body = await request.json();
      const { chatId, userId, messageId, messageDate, text } =
        readTelegramUpdate(body);

      await scheduleWebhookEvent(ctx, recordWebhookEvent(api, env, {
        correlationId,
        eventType: "telegram_update_received",
        telegramUserId: userId,
        telegramMessageId: messageId,
        rawMessagePreview: text,
        metadata: {
          elapsedMs: elapsedSince(startedAt),
          telegramSentAt: telegramSentAt(messageDate),
          telegramToWebhookMs: telegramToWebhookMs(messageDate, startedAt),
        },
      }));

      if (chatId === undefined) {
        await scheduleWebhookEvent(ctx, recordWebhookEvent(api, env, {
          correlationId,
          eventType: "telegram_update_ignored",
          status: "ignored",
          telegramUserId: userId,
          telegramMessageId: messageId,
          rawMessagePreview: text,
          metadata: {
            elapsedMs: elapsedSince(startedAt),
            reason: "missing_chat_id",
          },
        }));
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

      const replyStartedAt = Date.now();
      await sendTelegramMessage(env, chatId, reply);
      await scheduleWebhookEvent(ctx, recordWebhookEvent(api, env, {
        correlationId,
        eventType: "telegram_reply_sent",
        telegramUserId: userId,
        telegramMessageId: messageId,
        rawMessagePreview: text,
        metadata: {
          elapsedMs: elapsedSince(startedAt),
          replySendDurationMs: elapsedSince(replyStartedAt),
          replyPreview: preview(reply),
        },
      }));
      return new Response("ok", { status: 200 });
    } catch (error) {
      await scheduleWebhookEvent(ctx, recordWebhookEvent(api, env, {
        correlationId,
        eventType: "telegram_webhook_failed",
        status: "failed",
        metadata: { elapsedMs: elapsedSince(startedAt) },
        errorMessage: error instanceof Error ? error.message : String(error),
      }));
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
  env: WebhookEnv,
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
    await recordBetterStackFallback(env, input, error);
    console.error(
      "[webhook] Failed to record system event:",
      error instanceof Error ? error.message : error,
    );
  }
}

async function recordBetterStackFallback(
  env: WebhookEnv,
  input: WebhookEventInput,
  systemEventError: unknown,
): Promise<void> {
  try {
    await sendBetterStackLog(
      {
        sourceToken: env.BETTER_STACK_SOURCE_TOKEN,
        ingestingHost: env.BETTER_STACK_INGESTING_HOST,
      },
      {
        message: input.eventType,
        service: "cloudflare",
        correlationId: input.correlationId,
        eventType: input.eventType,
        status: input.status ?? "ok",
        telegramUserId:
          input.telegramUserId === undefined
            ? undefined
            : String(input.telegramUserId),
        telegramMessageId:
          input.telegramMessageId === undefined
            ? undefined
            : String(input.telegramMessageId),
        rawMessagePreview: preview(input.rawMessagePreview),
        errorMessage: input.errorMessage,
        metadata: {
          ...input.metadata,
          delivery: "cloudflare_direct_fallback",
          systemEventError:
            systemEventError instanceof Error
              ? systemEventError.message
              : String(systemEventError),
        },
        environment: "production",
      },
    );
  } catch (error) {
    console.error(
      "[webhook] Failed to export fallback event:",
      error instanceof Error ? error.message : error,
    );
  }
}

async function scheduleWebhookEvent(
  ctx: ExecutionContext | undefined,
  event: Promise<void>,
): Promise<void> {
  if (ctx) {
    ctx.waitUntil(event);
    return;
  }

  await event;
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

function elapsedSince(startedAt: number): number {
  return Date.now() - startedAt;
}

function telegramSentAt(messageDate: number | undefined): string | undefined {
  return messageDate === undefined
    ? undefined
    : new Date(messageDate * 1000).toISOString();
}

function telegramToWebhookMs(
  messageDate: number | undefined,
  webhookStartedAt: number,
): number | undefined {
  return messageDate === undefined
    ? undefined
    : webhookStartedAt - messageDate * 1000;
}
