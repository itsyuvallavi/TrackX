// Owner: apps/web. Proxies browser authentication requests to Neon Auth.
import { getNeonAuth } from "@/lib/neon-auth";

type AuthRouteContext = {
  params: Promise<{ path: string[] }>;
};

export function GET(request: Request, context: AuthRouteContext) {
  return getNeonAuth().handler().GET(request, context);
}

export function POST(request: Request, context: AuthRouteContext) {
  return getNeonAuth().handler().POST(request, context);
}
