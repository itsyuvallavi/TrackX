// Owner: apps/web. Same-origin natural-language transaction API route.
import { NextResponse } from "next/server";
import { FromMessageSchema } from "@trackx/api-core";
import { requireTelegramApiUserId } from "@/lib/api-route-auth";
import { readJsonBody, toApiErrorResponse } from "@/lib/api-route-errors";
import { getFromMessageService } from "@/lib/api-route-runtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const input = FromMessageSchema.parse(await readJsonBody(request));
    if (input.telegramUserId) {
      await requireTelegramApiUserId(request, input.telegramUserId);
    }

    const response = await getFromMessageService().createFromMessage(input);
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
