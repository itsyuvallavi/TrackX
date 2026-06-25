// Owner: apps/web. Internal API route for TrackX operational event writes.
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSecret } from "@/lib/api-route-auth";
import { readJsonBody, toApiErrorResponse } from "@/lib/api-route-errors";
import { getMessageEventService } from "@/lib/api-route-runtime";

export const dynamic = "force-dynamic";

const SystemEventSchema = z.object({
  correlationId: z.string().min(1),
  source: z.string().min(1),
  eventType: z.string().min(1),
  status: z.enum(["ok", "ignored", "failed"]).optional(),
  userId: z.string().uuid().nullable().optional(),
  telegramUserId: z.string().min(1).nullable().optional(),
  telegramMessageId: z.string().min(1).nullable().optional(),
  rawMessagePreview: z.string().nullable().optional(),
  metadata: z.unknown().optional(),
  errorMessage: z.string().nullable().optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  try {
    requireApiSecret(request);
    const input = SystemEventSchema.parse(await readJsonBody(request));

    await getMessageEventService().record({
      ...input,
      error: input.errorMessage ?? undefined,
    });

    return NextResponse.json({ accepted: true }, { status: 202 });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
