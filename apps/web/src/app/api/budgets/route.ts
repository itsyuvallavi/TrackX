// Owner: apps/web. Same-origin budget list API route.
import { NextResponse, type NextRequest } from "next/server";
import { BudgetListQuerySchema } from "@trackx/api-core";
import { BudgetLimitUpsertSchema } from "@trackx/shared";
import { requireApiUserId } from "@/lib/api-route-auth";
import { readJsonBody, toApiErrorResponse } from "@/lib/api-route-errors";
import { getBudgetService } from "@/lib/api-route-runtime";
import { queryObject } from "@/lib/api-route-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireApiUserId();
    const query = BudgetListQuerySchema.parse(queryObject(request));
    return NextResponse.json(
      await getBudgetService().list({ ...query, userId }),
    );
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireApiUserId();
    const input = BudgetLimitUpsertSchema.parse(await readJsonBody(request));
    return NextResponse.json(
      await getBudgetService().upsert({ ...input, userId }),
    );
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
