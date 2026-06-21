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

export function toUnauthorizedResponse(error: unknown): NextResponse | null {
  if (!(error instanceof ApiUnauthorizedError)) {
    return null;
  }

  return NextResponse.json({ error: error.message }, { status: 401 });
}
