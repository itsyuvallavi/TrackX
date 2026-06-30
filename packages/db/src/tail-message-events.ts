// Owner: packages/db. Live terminal tail for unified TrackX message events.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createPrismaClient } from "./client.js";

const DEFAULT_INTERVAL_MS = 2000;
const DEFAULT_LIMIT = 25;

loadRootEnv();

const intervalMs = readNumberFlag("--interval", DEFAULT_INTERVAL_MS);
const initialLimit = readNumberFlag("--limit", DEFAULT_LIMIT);
const runOnce = process.argv.includes("--once");
const timeZone =
  readStringFlag("--timezone") ??
  process.env.DEFAULT_TIMEZONE ??
  "Europe/Lisbon";
const prisma = createPrismaClient();
let newestSeen: Date | null = null;
const seenIds = new Set<string>();

console.log("TrackX live message log");
console.log(
  `Polling Supabase/Postgres every ${intervalMs}ms. Press Ctrl+C to stop.`,
);
console.log(`Time zone: ${timeZone}`);
console.log(`Database: ${databaseLabel(process.env.DATABASE_URL)}\n`);

await printInitialEvents();

if (runOnce) {
  await prisma.$disconnect();
  process.exit(0);
}

const timer = setInterval(() => {
  void printNewEvents();
}, intervalMs);

process.on("SIGINT", async () => {
  clearInterval(timer);
  await prisma.$disconnect();
  process.stdout.write("\nStopped live message log.\n");
  process.exit(0);
});

async function printInitialEvents(): Promise<void> {
  const events = await getRecentEvents();

  for (const event of events.reverse()) {
    printEvent(event);
    markSeen(event.id, event.createdAt);
  }
}

async function getRecentEvents() {
  return prisma.messageEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: initialLimit,
  });
}

async function printNewEvents(): Promise<void> {
  const query = {
    orderBy: { createdAt: "asc" },
    take: 100,
  } as const;
  const events = newestSeen
    ? await prisma.messageEvent.findMany({
        ...query,
        where: { createdAt: { gte: newestSeen } },
      })
    : await prisma.messageEvent.findMany(query);

  for (const event of events) {
    if (seenIds.has(event.id)) {
      continue;
    }

    printEvent(event);
    markSeen(event.id, event.createdAt);
  }
}

type MessageEventForTail = Awaited<ReturnType<typeof getRecentEvents>>[number];

function printEvent(event: MessageEventForTail): void {
  const metadata = metadataRecord(event.metadata);
  const parts = [
    formatLocalTimestamp(event.createdAt),
    event.correlationId.slice(0, 8),
    event.source.padEnd(10),
    event.eventType.padEnd(28),
    event.status.toUpperCase().padEnd(7),
    event.rawMessagePreview ? `"${event.rawMessagePreview}"` : "",
    timingSummary(metadata),
    event.errorMessage ? `error=${event.errorMessage}` : "",
  ].filter(Boolean);

  console.log(parts.join("  "));
}

function markSeen(id: string, createdAt: Date): void {
  seenIds.add(id);
  newestSeen =
    newestSeen === null || createdAt > newestSeen ? createdAt : newestSeen;

  if (seenIds.size > 1000) {
    seenIds.clear();
  }
}

function metadataRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function timingSummary(metadata: Record<string, unknown>): string {
  const keys = [
    "elapsedMs",
    "telegramToWebhookMs",
    "parserDurationMs",
    "dbWriteDurationMs",
    "replySendDurationMs",
    "pendingLookupDurationMs",
    "intentDurationMs",
  ];
  const pairs = keys
    .map((key) => [key, metadata[key]] as const)
    .filter(([, value]) => typeof value === "number")
    .map(([key, value]) => `${key}=${value}ms`);

  return pairs.length > 0 ? pairs.join(" ") : "";
}

function readNumberFlag(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  const raw = index === -1 ? undefined : process.argv[index + 1];
  const parsed = raw ? Number(raw) : Number.NaN;

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function readStringFlag(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  const raw = index === -1 ? undefined : process.argv[index + 1];

  return raw && !raw.startsWith("--") ? raw : undefined;
}

function formatLocalTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const byType = new Map(parts.map((part) => [part.type, part.value]));

  return `${byType.get("year")}-${byType.get("month")}-${byType.get("day")} ${byType.get("hour")}:${byType.get("minute")}:${byType.get("second")}`;
}

function loadRootEnv(): void {
  const envPath = resolve(process.cwd(), "../../.env");

  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line);
    const key = match?.[1];

    if (!key || process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = match[2]?.replace(/^"|"$/g, "");
  }
}

function databaseLabel(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    return "default Prisma configuration";
  }

  try {
    const url = new URL(databaseUrl);
    return `${url.protocol}//${url.hostname}${url.pathname}`;
  } catch {
    return "configured DATABASE_URL";
  }
}
