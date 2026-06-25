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

    consoleSpy.mockRestore();
  });
});

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
