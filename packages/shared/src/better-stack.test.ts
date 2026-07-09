// Owner: packages/shared. Focused Better Stack delivery contract tests.
import { afterEach, describe, expect, it, vi } from "vitest";
import { sendBetterStackLog } from "./better-stack.js";

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
});
