// Owner: apps/webhook. Worker entrypoint tests for Telegram webhook delivery.
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../index.js";
import type { WebhookEnv } from "../env.js";

describe("webhook worker", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("records unauthorized Telegram webhook attempts before rejecting", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ accepted: true }), {
        status: 202,
        headers: { "content-type": "application/json" },
      }),
    );

    const response = await worker.fetch(
      new Request("https://worker.test", { method: "POST" }),
      env(),
    );

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.test/system-events");
  });
});

function env(): WebhookEnv {
  return {
    TELEGRAM_BOT_TOKEN: "test-token",
    TELEGRAM_ALLOWED_USER_IDS: "123",
    API_BASE_URL: "https://api.test",
    TRACKX_API_SECRET: "test-secret",
    DEFAULT_TIMEZONE: "Europe/Lisbon",
    DEFAULT_CURRENCY: "EUR",
    TELEGRAM_WEBHOOK_SECRET: "expected-secret",
  };
}
