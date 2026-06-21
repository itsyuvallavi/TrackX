// Owner: apps/web. Small helpers for Next.js API route handlers.
import type { NextRequest } from "next/server";

export const dynamicApiRoute = "force-dynamic";

export function queryObject(request: NextRequest): Record<string, string> {
  return Object.fromEntries(request.nextUrl.searchParams.entries());
}
