// Owner: apps/web. Same-origin single transaction API route.
import { NextResponse, type NextRequest } from "next/server";
import {
  ApiUpdateTransactionSchema,
  TransactionParamsSchema,
  UserQuerySchema,
} from "@trackx/api-core";
import { readJsonBody, toApiErrorResponse } from "@/lib/api-route-errors";
import { getTransactionService } from "@/lib/api-route-runtime";
import { queryObject } from "@/lib/api-route-utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const params = TransactionParamsSchema.parse(await context.params);
    const input = ApiUpdateTransactionSchema.parse(await readJsonBody(request));
    return NextResponse.json(
      await getTransactionService().update(params.id, input),
    );
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  try {
    const params = TransactionParamsSchema.parse(await context.params);
    const query = UserQuerySchema.parse(queryObject(request));
    return NextResponse.json(
      await getTransactionService().remove(params.id, query.userId),
    );
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
