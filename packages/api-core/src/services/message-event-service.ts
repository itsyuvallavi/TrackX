// Owner: packages/api-core. Best-effort lifecycle logging for message flows.
import type {
  CreateMessageEventInput,
  MessageEventRepository,
  MessageEventStatus,
} from "../repositories/message-events.js";

const MAX_PREVIEW_LENGTH = 180;
const MAX_ERROR_LENGTH = 500;

export type RecordMessageEventInput = {
  correlationId?: string | null | undefined;
  source: string;
  eventType: string;
  status?: MessageEventStatus | undefined;
  userId?: string | null | undefined;
  telegramUserId?: string | null | undefined;
  telegramMessageId?: string | null | undefined;
  rawMessage?: string | null | undefined;
  rawMessagePreview?: string | null | undefined;
  metadata?: unknown | undefined;
  error?: unknown;
};

export type MessageEventService = {
  record(input: RecordMessageEventInput): Promise<void>;
};

export function createMessageEventService(
  repository: MessageEventRepository,
): MessageEventService {
  return {
    async record(input) {
      if (!input.correlationId) {
        return;
      }

      try {
        await repository.create(toCreateInput(input));
      } catch (error) {
        console.error(
          "[message-events] failed to record event:",
          error instanceof Error ? error.message : error,
        );
      }
    },
  };
}

function toCreateInput(
  input: RecordMessageEventInput,
): CreateMessageEventInput {
  return {
    correlationId: input.correlationId ?? "",
    source: input.source,
    eventType: input.eventType,
    status: input.status ?? (input.error ? "failed" : "ok"),
    userId: input.userId ?? null,
    telegramUserId: input.telegramUserId ?? null,
    telegramMessageId: input.telegramMessageId ?? null,
    rawMessagePreview: preview(input.rawMessagePreview ?? input.rawMessage),
    metadata: input.metadata ?? null,
    errorMessage: input.error ? errorMessage(input.error) : null,
  };
}

function preview(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length <= MAX_PREVIEW_LENGTH) {
    return normalized;
  }

  return `${normalized.slice(0, MAX_PREVIEW_LENGTH - 3)}...`;
}

function errorMessage(error: unknown): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown message event error.";

  return message.length <= MAX_ERROR_LENGTH
    ? message
    : `${message.slice(0, MAX_ERROR_LENGTH - 3)}...`;
}
