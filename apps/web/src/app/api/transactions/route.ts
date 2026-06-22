// Owner: apps/web. Same-origin transaction collection API route.
import { NextResponse, type NextRequest } from "next/server";
import { ApiCreateTransactionSchema } from "@trackx/api-core";
import { requireApiUserId } from "@/lib/api-route-auth";
import { readJsonBody, toApiErrorResponse } from "@/lib/api-route-errors";
import { getTransactionService } from "@/lib/api-route-runtime";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await requireApiUserId();
    const limit = parseLimit(request.nextUrl.searchParams.get("limit"));

    if (limit) {
      return NextResponse.json(
        await getTransactionService().listRecent(
          userId,
          limit,
          "transactionDate",
        ),
      );
    }

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

function parseLimit(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const limit = Number(value);

  if (!Number.isInteger(limit) || limit < 1) {
    return null;
  }

  return Math.min(limit, 50);
}
