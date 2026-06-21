// Owner: apps/web. Same-origin transaction collection API route.
import { NextResponse, type NextRequest } from "next/server";
import { ApiCreateTransactionSchema, UserQuerySchema } from "@trackx/api-core";
import { readJsonBody, toApiErrorResponse } from "@/lib/api-route-errors";
import { getTransactionService } from "@/lib/api-route-runtime";
import { queryObject } from "@/lib/api-route-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const query = UserQuerySchema.parse(queryObject(request));
    return NextResponse.json(await getTransactionService().list(query.userId));
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const input = ApiCreateTransactionSchema.parse(await readJsonBody(request));
    const transaction = await getTransactionService().create(input);
    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
