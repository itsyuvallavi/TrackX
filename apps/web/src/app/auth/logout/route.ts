// Owner: apps/web. Neon Auth logout route for clearing dashboard sessions.
import { NextResponse, type NextRequest } from "next/server";
import { getNeonAuth } from "@/lib/neon-auth";

export async function POST(request: NextRequest): Promise<NextResponse> {
  await getNeonAuth().signOut();

  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
}
