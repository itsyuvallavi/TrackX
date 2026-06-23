// Owner: apps/web. Authenticated Telegram connection status API route.
import { NextResponse } from "next/server";
import { requireApiUserId } from "@/lib/api-route-auth";
import { toApiErrorResponse } from "@/lib/api-route-errors";
import { getUserRepository } from "@/lib/api-route-runtime";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await requireApiUserId();
    const connection = await getUserRepository().getTelegramConnection(userId);
    const telegramUserId = connection?.telegramUserId ?? null;

    return NextResponse.json({
      connected: telegramUserId !== null,
      telegramUserId,
    });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
