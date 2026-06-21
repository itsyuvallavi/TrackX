// Owner: apps/web. Same-origin transaction undo API route.
import { NextResponse } from "next/server";
import { UndoLastSchema } from "@trackx/api-core";
import { readJsonBody, toApiErrorResponse } from "@/lib/api-route-errors";
import { getTransactionService } from "@/lib/api-route-runtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const input = UndoLastSchema.parse(await readJsonBody(request));
    return NextResponse.json(await getTransactionService().undoLast(input));
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
