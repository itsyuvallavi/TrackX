// Owner: apps/web. Same-origin month dashboard API route.
import { NextResponse, type NextRequest } from "next/server";
import { requireApiUserId } from "@/lib/api-route-auth";
import { toApiErrorResponse } from "@/lib/api-route-errors";
import { getBudgetService } from "@/lib/api-route-runtime";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireApiUserId();
    return NextResponse.json(
      await getBudgetService().getMonthDashboard(userId),
    );
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
