// Owner: packages/shared. Focused Better Stack delivery contract tests.
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatOperationalFailureLog,
  sendBetterStackLog,
} from "./better-stack.js";

describe("sendBetterStackLog", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("skips delivery when configuration is incomplete", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      sendBetterStackLog({}, { message: "parser_started", service: "api" }),
    ).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts structured events without putting the token in the payload", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      sendBetterStackLog(
        {
          sourceToken: "secret-token",
          ingestingHost: "logs.example.com",
        },
        {
          dt: "2026-07-09T18:00:00.000Z",
          message: "transactions_created",
          service: "api",
          correlationId: "trace-1",
          status: "ok",
        },
      ),
    ).resolves.toBe(true);

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://logs.example.com",
      expect.objectContaining({
        method: "POST",
        headers: {
          authorization: "Bearer secret-token",
          "content-type": "application/json",
        },
      }),
    );

    const request = fetchSpy.mock.calls[0]?.[1] as { body?: string };
    expect(request.body).toContain('"correlationId":"trace-1"');
    expect(request.body).not.toContain("secret-token");
  });

  it("rejects insecure ingestion endpoints", async () => {
    await expect(
      sendBetterStackLog(
        {
          sourceToken: "secret-token",
          ingestingHost: "http://logs.example.com",
        },
        { message: "parser_failed", service: "api" },
      ),
    ).rejects.toThrow("must use HTTPS");
  });

  it("exports only allowlisted operational data", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal("fetch", fetchSpy);

    const unsafeLog = {
      message: "transactions_created",
      service: "api",
      correlationId: "trace-privacy",
      errorMessage: "Authorization: Bearer private-value",
      metadata: {
        elapsedMs: 42,
        parserDurationMs: 20,
        replyPreview: "Logged a private purchase.",
        userId: "user-private",
        unknownNestedValue: { token: "nested-private" },
      },
      environment: "production",
      userId: "user-private",
      telegramUserId: "telegram-private",
      rawMessagePreview: "private purchase message",
    } as unknown as Parameters<typeof sendBetterStackLog>[1];

    await sendBetterStackLog(
      {
        sourceToken: "secret-token",
        ingestingHost: "logs.example.com",
      },
      unsafeLog,
    );

    const request = fetchSpy.mock.calls[0]?.[1] as { body?: string };
    const body = request.body ?? "";

    expect(body).toContain('"elapsedMs":42');
    expect(body).toContain('"parserDurationMs":20');
    expect(body).toContain("Authorization:[REDACTED]");
    expect(body).not.toContain("private-value");
    expect(body).not.toContain("user-private");
    expect(body).not.toContain("telegram-private");
    expect(body).not.toContain("private purchase message");
    expect(body).not.toContain("Logged a private purchase");
    expect(body).not.toContain("nested-private");
  });

  it("redacts token and database password patterns in fallback errors", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 202 });
    vi.stubGlobal("fetch", fetchSpy);

    await sendBetterStackLog(
      {
        sourceToken: "secret-token",
        ingestingHost: "logs.example.com",
      },
      {
        message: "telegram_webhook_failed",
        service: "cloudflare",
        metadata: {
          delivery: "cloudflare_direct_fallback",
          systemEventError:
            "token=txs_private postgresql://postgres:db-password@db.example.com/postgres",
        },
      },
    );

    const request = fetchSpy.mock.calls[0]?.[1] as { body?: string };
    const body = request.body ?? "";

    expect(body).toContain("cloudflare_direct_fallback");
    expect(body).not.toContain("txs_private");
    expect(body).not.toContain("db-password");
  });
});

describe("formatOperationalFailureLog", () => {
  it("keeps trace fields and redacts secrets from native fallback logs", () => {
    const payload = JSON.parse(
      formatOperationalFailureLog({
        message: "message_event_export_failed",
        service: "vercel",
        correlationId: "trace-native",
        failedEventType: "apple_wallet_import_received",
        error: new Error(
          "Authorization: Bearer private-token postgresql://postgres:db-password@db.example.com/postgres",
        ),
      }),
    ) as Record<string, unknown>;

    expect(payload).toEqual({
      level: "error",
      message: "message_event_export_failed",
      service: "vercel",
      correlationId: "trace-native",
      failedEventType: "apple_wallet_import_received",
      errorMessage:
        "Authorization:[REDACTED] postgresql://postgres:[REDACTED]@db.example.com/postgres",
    });
  });
});
