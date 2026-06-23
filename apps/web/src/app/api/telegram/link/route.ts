// Owner: apps/web. Server-to-server Telegram link-code consumption route.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSecret } from "@/lib/api-route-auth";
import { readJsonBody, toApiErrorResponse } from "@/lib/api-route-errors";
import { getTelegramLinkService } from "@/lib/api-route-runtime";

export const dynamic = "force-dynamic";

const TelegramLinkRequestSchema = z.object({
  code: z.string().trim().min(1),
  telegramUserId: z.string().trim().min(1),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    requireApiSecret(request);
    const input = TelegramLinkRequestSchema.parse(await readJsonBody(request));
    const result = await getTelegramLinkService().consumeLinkCode(input);

    return NextResponse.json({ status: result.status });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
