// Owner: apps/web. Same-origin transaction undo API route.
import { NextResponse } from "next/server";
import { UndoLastSchema } from "@trackx/api-core";
import { requireTelegramApiUserId } from "@/lib/api-route-auth";
import { readJsonBody, toApiErrorResponse } from "@/lib/api-route-errors";
import { getTransactionService } from "@/lib/api-route-runtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const input = UndoLastSchema.parse(await readJsonBody(request));
    const userId = await requireTelegramApiUserId(
      request,
      input.telegramUserId,
    );

    return NextResponse.json(
      await getTransactionService().undoLast({ ...input, userId }),
    );
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
