// Owner: packages/api-core. Focused tests for best-effort message event logging.
import { describe, expect, it, vi } from "vitest";
import type {
  CreateMessageEventInput,
  MessageEventRepository,
} from "../repositories/message-events.js";
import { createMessageEventService } from "../services/message-event-service.js";

describe("createMessageEventService", () => {
  it("records compact lifecycle events", async () => {
    const created: CreateMessageEventInput[] = [];
    const service = createMessageEventService(fakeRepository(created));

    await service.record({
      correlationId: "trace-1",
      source: "cloudflare",
      eventType: "telegram_update_received",
      telegramUserId: "123",
      rawMessage: " spent   15 eur on food ",
    });

    expect(created).toEqual([
      {
        correlationId: "trace-1",
        source: "cloudflare",
        eventType: "telegram_update_received",
        status: "ok",
        userId: null,
        telegramUserId: "123",
        telegramMessageId: null,
        rawMessagePreview: "spent 15 eur on food",
        metadata: null,
        errorMessage: null,
      },
    ]);
  });

  it("skips events without a correlation id", async () => {
    const created: CreateMessageEventInput[] = [];
    const service = createMessageEventService(fakeRepository(created));

    await service.record({
      source: "api",
      eventType: "parser_started",
    });

    expect(created).toEqual([]);
  });

  it("does not throw when event persistence fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const service = createMessageEventService({
      async create() {
        throw new Error("database unavailable");
      },
    });

    await expect(
      service.record({
        correlationId: "trace-2",
        source: "api",
        eventType: "parser_started",
      }),
    ).resolves.toBeUndefined();

    expect(parseNativeLog(consoleSpy)).toEqual({
      level: "error",
      message: "message_event_persistence_failed",
      service: "vercel",
      correlationId: "trace-2",
      failedEventType: "parser_started",
      errorMessage: "database unavailable",
    });

    consoleSpy.mockRestore();
  });

  it("exports the same compact event to an optional observer", async () => {
    const created: CreateMessageEventInput[] = [];
    const observed: CreateMessageEventInput[] = [];
    const service = createMessageEventService(fakeRepository(created), {
      async record(input) {
        observed.push(input);
      },
    });

    await service.record({
      correlationId: "trace-3",
      source: "api",
      eventType: "transactions_created",
      rawMessage: " spent   15 eur on food ",
    });

    expect(observed).toEqual(created);
  });

  it("does not throw when external event export fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const service = createMessageEventService(fakeRepository([]), {
      async record() {
        throw new Error("telemetry unavailable");
      },
    });

    await expect(
      service.record({
        correlationId: "trace-4",
        source: "api",
        eventType: "parser_started",
      }),
    ).resolves.toBeUndefined();
    expect(parseNativeLog(consoleSpy)).toEqual({
      level: "error",
      message: "message_event_export_failed",
      service: "vercel",
      correlationId: "trace-4",
      failedEventType: "parser_started",
      errorMessage: "telemetry unavailable",
    });

    consoleSpy.mockRestore();
  });

  it("schedules external export without delaying durable persistence", async () => {
    const observed: CreateMessageEventInput[] = [];
    const scheduled: Array<() => Promise<void>> = [];
    const service = createMessageEventService(
      fakeRepository([]),
      {
        async record(input) {
          observed.push(input);
        },
      },
      (task) => scheduled.push(task),
    );

    await service.record({
      correlationId: "trace-5",
      source: "api",
      eventType: "apple_wallet_import_received",
    });

    expect(observed).toEqual([]);
    expect(scheduled).toHaveLength(1);

    await scheduled[0]?.();

    expect(observed).toHaveLength(1);
  });

  it("does not throw when external export scheduling fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const service = createMessageEventService(
      fakeRepository([]),
      { async record() {} },
      () => {
        throw new Error("request lifecycle unavailable");
      },
    );

    await expect(
      service.record({
        correlationId: "trace-6",
        source: "api",
        eventType: "parser_started",
      }),
    ).resolves.toBeUndefined();
    expect(parseNativeLog(consoleSpy)).toEqual({
      level: "error",
      message: "message_event_export_failed",
      service: "vercel",
      correlationId: "trace-6",
      failedEventType: "parser_started",
      errorMessage: "request lifecycle unavailable",
    });

    consoleSpy.mockRestore();
  });
});

function parseNativeLog(
  consoleSpy: ReturnType<typeof vi.spyOn>,
): Record<string, unknown> {
  return JSON.parse(String(consoleSpy.mock.calls[0]?.[0])) as Record<
    string,
    unknown
  >;
}

function fakeRepository(
  created: CreateMessageEventInput[],
): MessageEventRepository {
  return {
    async create(input) {
      created.push(input);
      return {
        id: "event-1",
        correlationId: input.correlationId,
        source: input.source,
        eventType: input.eventType,
        status: input.status,
        createdAt: "2026-06-25T00:00:00.000Z",
      };
    },
  };
}
