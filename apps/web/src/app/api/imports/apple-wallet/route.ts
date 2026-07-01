// Owner: apps/web. Public iOS Shortcut Wallet import API route.
import { randomUUID } from "node:crypto";
import { after, NextResponse } from "next/server";
import { AppleWalletImportSchema } from "@trackx/api-core";
import { normalizeTimezone } from "@trackx/shared";
import { readJsonBody, toApiErrorResponse } from "@/lib/api-route-errors";
import {
  getMessageEventService,
  getShortcutImportService,
} from "@/lib/api-route-runtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  const startedAt = Date.now();
  const correlationId = randomUUID();
  let rawMessage: string | undefined;

  try {
    const payload = AppleWalletImportSchema.parse(await readJsonBody(request));
    rawMessage = previewPayload(payload);
    scheduleImportEvent(correlationId, "apple_wallet_import_received", {
      rawMessage,
      metadata: { elapsedMs: elapsedSince(startedAt) },
    });

    const response = await getShortcutImportService().importAppleWallet({
      authorization: request.headers.get("authorization"),
      payload,
      correlationId,
      defaultTimezone: normalizeTimezone(
        process.env.DEFAULT_TIMEZONE ?? "Europe/Lisbon",
      ),
      defaultCurrency: "EUR",
    });

    scheduleImportEvent(correlationId, "apple_wallet_import_completed", {
      rawMessage,
      metadata: {
        elapsedMs: elapsedSince(startedAt),
        transactionCount: response.transactions.length,
      },
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    scheduleImportEvent(correlationId, "apple_wallet_import_failed", {
      status: "failed",
      rawMessage,
      metadata: { elapsedMs: elapsedSince(startedAt) },
      error,
    });

    return toApiErrorResponse(error);
  }
}

function scheduleImportEvent(
  correlationId: string,
  eventType: string,
  extra: {
    status?: "ok" | "failed";
    rawMessage?: string | undefined;
    metadata?: Record<string, unknown>;
    error?: unknown;
  },
): void {
  after(() =>
    getMessageEventService().record({
      correlationId,
      source: "api",
      eventType,
      status: extra.status,
      ...(extra.rawMessage ? { rawMessage: extra.rawMessage } : {}),
      metadata: extra.metadata,
      error: extra.error,
    }),
  );
}

function previewPayload(payload: {
  merchant?: unknown;
  name?: unknown;
  amount?: unknown;
}): string {
  const merchant = stringValue(payload.merchant) ?? stringValue(payload.name);
  const amount = stringValue(payload.amount);

  return [merchant, amount].filter(Boolean).join(" ").slice(0, 160);
}

function stringValue(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function elapsedSince(startedAt: number): number {
  return Date.now() - startedAt;
}
