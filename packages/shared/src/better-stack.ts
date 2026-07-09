// Owner: packages/shared. Best-effort Better Stack structured log delivery.
const DEFAULT_TIMEOUT_MS = 1_500;

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
  userId?: string | null | undefined;
  telegramUserId?: string | null | undefined;
  telegramMessageId?: string | null | undefined;
  rawMessagePreview?: string | null | undefined;
  errorMessage?: string | null | undefined;
  metadata?: unknown | undefined;
  environment?: string | undefined;
};

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
    body: JSON.stringify({
      dt: log.dt ?? new Date().toISOString(),
      level: log.level ?? levelForStatus(log.status),
      ...compact(log),
    }),
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

  const url = new URL(value.startsWith("https://") ? value : `https://${value}`);

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

function compact(log: BetterStackLog): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(log).filter(([, value]) => value !== undefined),
  );
}
