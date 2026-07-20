// Owner: apps/web. Protects private pages and refreshes Neon Auth sessions.
import type { NextRequest } from "next/server";
import { getNeonAuth } from "@/lib/neon-auth";

export default function proxy(request: NextRequest) {
  return getNeonAuth().middleware({ loginUrl: "/login" })(request);
}

export const config = {
  matcher: ["/dashboard/:path*", "/transactions/:path*", "/settings/:path*"],
};
