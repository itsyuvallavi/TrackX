// Owner: apps/web. Same-origin budget list API route.
import { NextResponse, type NextRequest } from "next/server";
import { BudgetListQuerySchema } from "@trackx/api-core";
import { requireApiUserId } from "@/lib/api-route-auth";
import { toApiErrorResponse } from "@/lib/api-route-errors";
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
