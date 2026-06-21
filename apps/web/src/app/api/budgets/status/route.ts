// Owner: apps/web. Same-origin budget status API route.
import { NextResponse, type NextRequest } from "next/server";
import { BudgetStatusQuerySchema } from "@trackx/api-core";
import { toApiErrorResponse } from "@/lib/api-route-errors";
import { getBudgetService } from "@/lib/api-route-runtime";
import { queryObject } from "@/lib/api-route-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const query = BudgetStatusQuerySchema.parse(queryObject(request));
    return NextResponse.json(await getBudgetService().getStatus(query));
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
