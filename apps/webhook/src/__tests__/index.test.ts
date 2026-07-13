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

  it("writes a traceable native log when the system event API fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("unavailable", { status: 503 }),
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await worker.fetch(
      new Request("https://worker.test", { method: "POST" }),
      env(),
    );

    expect(response.status).toBe(401);
    const payload = JSON.parse(String(consoleSpy.mock.calls[0]?.[0])) as Record<
      string,
      unknown
    >;

    expect(payload).toMatchObject({
      level: "error",
      message: "system_event_write_failed",
      service: "cloudflare",
      failedEventType: "telegram_webhook_unauthorized",
      errorMessage: "TrackX API returned 503.",
    });
    expect(payload.correlationId).toEqual(expect.any(String));
    expect(payload).not.toHaveProperty("rawMessagePreview");
    expect(payload).not.toHaveProperty("telegramUserId");
  });

  it("logs both failures when the system event and hosted fallback fail", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response("unavailable", { status: 502 }));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await worker.fetch(
      new Request("https://worker.test", { method: "POST" }),
      {
        ...env(),
        BETTER_STACK_SOURCE_TOKEN: "source-token",
        BETTER_STACK_INGESTING_HOST: "logs.example.com",
      },
    );

    expect(response.status).toBe(401);
    const payloads = consoleSpy.mock.calls.map(
      ([value]) => JSON.parse(String(value)) as Record<string, unknown>,
    );

    expect(payloads).toHaveLength(2);
    expect(payloads[0]).toMatchObject({
      message: "better_stack_fallback_failed",
      service: "cloudflare",
      failedEventType: "telegram_webhook_unauthorized",
      errorMessage: "Better Stack ingestion failed with 502.",
    });
    expect(payloads[1]).toMatchObject({
      message: "system_event_write_failed",
      service: "cloudflare",
      failedEventType: "telegram_webhook_unauthorized",
      errorMessage: "TrackX API returned 503.",
    });
    expect(payloads[0]?.correlationId).toBe(payloads[1]?.correlationId);
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
