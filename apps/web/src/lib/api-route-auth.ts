// Owner: apps/web. Authentication helpers for same-origin Next.js API routes.
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth";
import { getUserRepository } from "@/lib/api-route-runtime";

export class ApiUnauthorizedError extends Error {
  constructor() {
    super("Unauthorized.");
    this.name = "ApiUnauthorizedError";
  }
}

export async function requireApiUserId(): Promise<string> {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new ApiUnauthorizedError();
  }

  await getUserRepository().ensureAuthUser({
    authUserId: user.id,
    email: user.email,
  });

  return user.id;
}

export async function requireTelegramApiUserId(
  request: Request,
  telegramUserId: string | null | undefined,
): Promise<string> {
  if (!hasValidApiSecret(request) || !telegramUserId) {
    throw new ApiUnauthorizedError();
  }

  const user = await getUserRepository().findByTelegramUserId(telegramUserId);

  if (!user) {
    throw new ApiUnauthorizedError();
  }

  return user.id;
}

export async function requireApiUserIdOrTelegram(
  request: Request,
  telegramUserId: string | null | undefined,
): Promise<string> {
  if (hasValidApiSecret(request)) {
    return requireTelegramApiUserId(request, telegramUserId);
  }

  return requireApiUserId();
}

export function toUnauthorizedResponse(error: unknown): NextResponse | null {
  if (!(error instanceof ApiUnauthorizedError)) {
    return null;
  }

  return NextResponse.json({ error: error.message }, { status: 401 });
}

function hasValidApiSecret(request: Request): boolean {
  const expected = process.env.TRACKX_API_SECRET?.trim();
  const received = request.headers.get("x-trackx-api-secret")?.trim();

  return Boolean(expected && received && received === expected);
}
