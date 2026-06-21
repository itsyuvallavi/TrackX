// Owner: apps/web. Same-origin budget status API route.
import { NextResponse, type NextRequest } from "next/server";
import { BudgetStatusQuerySchema } from "@trackx/api-core";
import { requireApiUserIdOrTelegram } from "@/lib/api-route-auth";
import { toApiErrorResponse } from "@/lib/api-route-errors";
import { getBudgetService } from "@/lib/api-route-runtime";
import { queryObject } from "@/lib/api-route-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const rawQuery = queryObject(request);
    const userId = await requireApiUserIdOrTelegram(
      request,
      rawQuery.telegramUserId,
    );
    const { telegramUserId: _telegramUserId, ...queryInput } = rawQuery;
    const query = BudgetStatusQuerySchema.parse(queryInput);
    return NextResponse.json(
      await getBudgetService().getStatus({ ...query, userId }),
    );
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
