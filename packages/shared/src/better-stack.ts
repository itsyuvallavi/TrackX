// Owner: packages/shared. Best-effort Better Stack structured log delivery.
const DEFAULT_TIMEOUT_MS = 1_500;
const MAX_DIMENSION_LENGTH = 120;
const MAX_ERROR_LENGTH = 500;
const MAX_METADATA_STRING_LENGTH = 180;

const ALLOWED_METADATA_KEYS = new Set([
  "backgroundElapsedMs",
  "categoryOverride",
  "categoryOverrideSource",
  "clarificationWriteDurationMs",
  "cleanupDurationMs",
  "dbWriteDurationMs",
  "delivery",
  "elapsedMs",
  "feedbackDurationMs",
  "hasSecretHeader",
  "intentDurationMs",
  "merchantRuleOverrideCount",
  "parser",
  "parserDurationMs",
  "pendingLookupDurationMs",
  "reason",
  "replySendDurationMs",
  "systemEventError",
  "telegramSentAt",
  "telegramToWebhookMs",
  "transactionCount",
  "userResolveDurationMs",
]);

export type BetterStackConfig = {
  sourceToken?: string | null | undefined;
  ingestingHost?: string | null | undefined;
  timeoutMs?: number | undefined;
};

export type BetterStackLog = {
  message: string;
  service: string;
  level?: "debug" | "info" | "warn" | "error" | undefined;
  dt?: string | undefined;
  correlationId?: string | null | undefined;
  eventType?: string | undefined;
  status?: string | undefined;
  errorMessage?: string | null | undefined;
  metadata?: unknown | undefined;
  environment?: string | undefined;
};

export type OperationalFailureLog = {
  message: string;
  service: string;
  correlationId?: string | null | undefined;
  failedEventType?: string | undefined;
  error: unknown;
};

export function formatOperationalFailureLog(
  input: OperationalFailureLog,
): string {
  return JSON.stringify(
    compact({
      level: "error",
      message: sanitizeDimension(input.message),
      service: sanitizeDimension(input.service),
      correlationId: sanitizeDimension(input.correlationId),
      failedEventType: sanitizeDimension(input.failedEventType),
      errorMessage: sanitizeText(errorText(input.error), MAX_ERROR_LENGTH),
    }),
  );
}

export async function sendBetterStackLog(
  config: BetterStackConfig,
  log: BetterStackLog,
): Promise<boolean> {
  const sourceToken = normalize(config.sourceToken);
  const ingestingHost = normalize(config.ingestingHost);

  if (!sourceToken || !ingestingHost) {
    return false;
  }

  const response = await fetch(toEndpoint(ingestingHost), {
    method: "POST",
    headers: {
      authorization: `Bearer ${sourceToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(toPayload(log)),
    signal: AbortSignal.timeout(config.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`Better Stack ingestion failed with ${response.status}.`);
  }

  return true;
}

function toEndpoint(value: string): string {
  if (value.startsWith("http://")) {
    throw new Error("Better Stack ingestion must use HTTPS.");
  }

  const url = new URL(
    value.startsWith("https://") ? value : `https://${value}`,
  );

  if (url.protocol !== "https:") {
    throw new Error("Better Stack ingestion must use HTTPS.");
  }

  return url.origin;
}

function normalize(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function levelForStatus(status: string | undefined): "info" | "warn" | "error" {
  if (status === "failed") {
    return "error";
  }

  if (status === "ignored") {
    return "warn";
  }

  return "info";
}

function toPayload(log: BetterStackLog): Record<string, unknown> {
  return compact({
    dt: log.dt ?? new Date().toISOString(),
    level: log.level ?? levelForStatus(log.status),
    message: sanitizeDimension(log.message),
    service: sanitizeDimension(log.service),
    correlationId: sanitizeDimension(log.correlationId),
    eventType: sanitizeDimension(log.eventType),
    status: sanitizeDimension(log.status),
    errorMessage: sanitizeText(log.errorMessage, MAX_ERROR_LENGTH),
    metadata: sanitizeMetadata(log.metadata),
    environment: sanitizeDimension(log.environment),
  });
}

function sanitizeMetadata(
  metadata: unknown,
): Record<string, string | number | boolean | null> | undefined {
  if (!isRecord(metadata)) {
    return undefined;
  }

  const entries = Object.entries(metadata).flatMap(([key, value]) => {
    if (!ALLOWED_METADATA_KEYS.has(key)) {
      return [];
    }

    const sanitized = sanitizeMetadataValue(value);
    return sanitized === undefined ? [] : [[key, sanitized] as const];
  });

  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function sanitizeMetadataValue(
  value: unknown,
): string | number | boolean | null | undefined {
  if (value === null || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === "string") {
    return sanitizeText(value, MAX_METADATA_STRING_LENGTH);
  }

  return undefined;
}

function sanitizeDimension(
  value: string | null | undefined,
): string | undefined {
  return sanitizeText(value, MAX_DIMENSION_LENGTH);
}

function sanitizeText(
  value: string | null | undefined,
  maxLength: number,
): string | undefined {
  const normalized = value?.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return undefined;
  }

  const redacted = redactSecrets(normalized);
  return redacted.length <= maxLength
    ? redacted
    : `${redacted.slice(0, maxLength - 3)}...`;
}

function errorText(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === "string" ? error : "Unknown operational error.";
}

function redactSecrets(value: string): string {
  return value
    .replace(
      /\bAuthorization\s*([=:])\s*(?:Bearer\s+)?[^\s,;]+/gi,
      "Authorization$1[REDACTED]",
    )
    .replace(/\bBearer\s+\S+/gi, "Bearer [REDACTED]")
    .replace(/\btxs_[A-Za-z0-9_-]+\b/g, "[REDACTED]")
    .replace(/\b\d{6,12}:[A-Za-z0-9_-]{20,}\b/g, "[REDACTED]")
    .replace(
      /\b(password|token|secret|api[_-]?key)\s*([=:])\s*[^\s,;]+/gi,
      "$1$2[REDACTED]",
    )
    .replace(/(postgres(?:ql)?:\/\/[^:\s/]+:)[^@\s]+@/gi, "$1[REDACTED]@");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function compact(input: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  );
}
