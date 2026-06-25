// Owner: apps/web. Same-origin natural-language transaction API route.
import { NextResponse } from "next/server";
import { FromMessageSchema, type FromMessageInput } from "@trackx/api-core";
import { requireTelegramApiUserId } from "@/lib/api-route-auth";
import { readJsonBody, toApiErrorResponse } from "@/lib/api-route-errors";
import {
  getFromMessageService,
  getMessageEventService,
} from "@/lib/api-route-runtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  let input: FromMessageInput | null = null;

  try {
    input = FromMessageSchema.parse(await readJsonBody(request));
    await recordFromMessageEvent(input, "api_from_message_received");
    const userId = await requireTelegramApiUserId(
      request,
      input.telegramUserId,
    );
    await recordFromMessageEvent(input, "api_auth_resolved", { userId });

    const response = await getFromMessageService().createFromMessage({
      ...input,
      userId,
    });
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (input) {
      await recordFromMessageEvent(input, "api_from_message_failed", {
        status: "failed",
        error,
      });
    }

    return toApiErrorResponse(error);
  }
}

async function recordFromMessageEvent(
  input: FromMessageInput,
  eventType: string,
  extra: { userId?: string; status?: "ok" | "failed"; error?: unknown } = {},
): Promise<void> {
  await getMessageEventService().record({
    correlationId: input.correlationId,
    source: "api",
    eventType,
    status: extra.status,
    userId: extra.userId,
    telegramUserId: input.telegramUserId,
    rawMessage: input.message,
    error: extra.error,
  });
}
