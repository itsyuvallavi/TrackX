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
    if (request.method === "GET") {
      return new Response("TrackX Telegram webhook is running.", {
        status: 200,
      });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed.", { status: 405 });
    }

    if (!isWebhookAuthorized(request, env)) {
      return new Response("Unauthorized.", { status: 401 });
    }

    try {
      const body = await request.json();
      const { chatId, userId, text } = readTelegramUpdate(body);

      if (chatId === undefined) {
        return new Response("ok", { status: 200 });
      }

      const incoming: IncomingMessage = {};

      if (userId !== undefined) {
        incoming.userId = userId;
      }

      if (text !== undefined) {
        incoming.text = text;
      }

      const reply = await handleIncomingMessage(incoming, {
        allowedUserIds: parseAllowedUserIds(env.TELEGRAM_ALLOWED_USER_IDS),
        api: createTrackxApiClient(env.API_BASE_URL),
        timezone: env.DEFAULT_TIMEZONE,
        defaultCurrency: env.DEFAULT_CURRENCY,
      });

      await sendTelegramMessage(env, chatId, reply);
      return new Response("ok", { status: 200 });
    } catch (error) {
      console.error(
        "[webhook] Failed to process Telegram update:",
        error instanceof Error ? error.message : error,
      );

      return new Response("Webhook processing failed.", { status: 500 });
    }
  },
};
