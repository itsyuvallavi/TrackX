// Owner: packages/api-core. Best-effort lifecycle logging for message flows.
import { formatOperationalFailureLog } from "@trackx/shared";
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

export type MessageEventObserver = {
  record(input: CreateMessageEventInput): Promise<void>;
};

export type MessageEventObservationScheduler = (
  task: () => Promise<void>,
) => void;

export function createMessageEventService(
  repository: MessageEventRepository,
  observer?: MessageEventObserver,
  scheduleObservation?: MessageEventObservationScheduler,
): MessageEventService {
  return {
    async record(input) {
      if (!input.correlationId) {
        return;
      }

      const event = toCreateInput(input);
      const persistencePromise = repository.create(event);
      let observationPromise = Promise.resolve();

      if (observer && scheduleObservation) {
        try {
          scheduleObservation(() => observe(observer, event));
        } catch (error) {
          logObservationError(event, error);
        }
      } else if (observer) {
        observationPromise = observer.record(event);
      }

      const [persistence, observation] = await Promise.allSettled([
        persistencePromise,
        observationPromise,
      ]);

      if (persistence.status === "rejected") {
        logEventFailure(
          "message_event_persistence_failed",
          event,
          persistence.reason,
        );
      }

      if (observation.status === "rejected") {
        logObservationError(event, observation.reason);
      }
    },
  };
}

async function observe(
  observer: MessageEventObserver,
  event: CreateMessageEventInput,
): Promise<void> {
  try {
    await observer.record(event);
  } catch (error) {
    logObservationError(event, error);
  }
}

function logObservationError(
  event: CreateMessageEventInput,
  error: unknown,
): void {
  logEventFailure("message_event_export_failed", event, error);
}

function logEventFailure(
  message: string,
  event: CreateMessageEventInput,
  error: unknown,
): void {
  console.error(
    formatOperationalFailureLog({
      message,
      service: "vercel",
      correlationId: event.correlationId,
      failedEventType: event.eventType,
      error,
    }),
  );
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
