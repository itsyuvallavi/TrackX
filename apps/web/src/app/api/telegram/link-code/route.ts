// Owner: apps/web. Authenticated Telegram link-code generation API route.
import { NextResponse } from "next/server";
import { requireApiUserId } from "@/lib/api-route-auth";
import { toApiErrorResponse } from "@/lib/api-route-errors";
import { getTelegramLinkService } from "@/lib/api-route-runtime";

export const dynamic = "force-dynamic";

export async function POST(): Promise<NextResponse> {
  try {
    const userId = await requireApiUserId();
    const linkCode = await getTelegramLinkService().createLinkCode(userId);

    return NextResponse.json({
      code: linkCode.code,
      expiresAt: linkCode.expiresAt.toISOString(),
    });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
