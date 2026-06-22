// Owner: apps/web. Same-origin latest transaction category update API route.
import { NextResponse } from "next/server";
import { UpdateLastCategorySchema } from "@trackx/api-core";
import { requireTelegramApiUserId } from "@/lib/api-route-auth";
import { readJsonBody, toApiErrorResponse } from "@/lib/api-route-errors";
import { getTransactionService } from "@/lib/api-route-runtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const input = UpdateLastCategorySchema.parse(await readJsonBody(request));
    const userId = await requireTelegramApiUserId(
      request,
      input.telegramUserId,
    );

    return NextResponse.json(
      await getTransactionService().updateLastCategory({ ...input, userId }),
    );
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
