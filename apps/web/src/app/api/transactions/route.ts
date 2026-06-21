// Owner: apps/web. Same-origin transaction collection API route.
import { NextResponse, type NextRequest } from "next/server";
import { ApiCreateTransactionSchema } from "@trackx/api-core";
import { requireApiUserId } from "@/lib/api-route-auth";
import { readJsonBody, toApiErrorResponse } from "@/lib/api-route-errors";
import { getTransactionService } from "@/lib/api-route-runtime";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireApiUserId();
    return NextResponse.json(await getTransactionService().list(userId));
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const userId = await requireApiUserId();
    const input = ApiCreateTransactionSchema.parse(await readJsonBody(request));
    const transaction = await getTransactionService().create({
      ...input,
      userId,
    });
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
