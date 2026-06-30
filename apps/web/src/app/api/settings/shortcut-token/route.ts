// Owner: apps/web. Authenticated Shortcut import token management API route.
import { NextResponse } from "next/server";
import { requireApiUserId } from "@/lib/api-route-auth";
import { toApiErrorResponse } from "@/lib/api-route-errors";
import { getShortcutImportService } from "@/lib/api-route-runtime";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await requireApiUserId();
    const token = await getShortcutImportService().getActiveToken(userId);

    return NextResponse.json({
      connected: Boolean(token),
      tokenPreview: token?.tokenPreview ?? null,
      lastUsedAt: token?.lastUsedAt ?? null,
      createdAt: token?.createdAt ?? null,
    });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function POST(): Promise<NextResponse> {
  try {
    const userId = await requireApiUserId();
    const token = await getShortcutImportService().createToken({ userId });

    return NextResponse.json(
      {
        token: token.token,
        tokenPreview: token.record.tokenPreview,
        createdAt: token.record.createdAt,
      },
      { status: 201 },
    );
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function DELETE(): Promise<NextResponse> {
  try {
    const userId = await requireApiUserId();
    await getShortcutImportService().revokeActiveToken(userId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
