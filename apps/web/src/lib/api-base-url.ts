// Owner: apps/web. Resolves the server-side dashboard API base URL.
import { headers } from "next/headers";

type RequestHeaderStore = {
  get(name: string): string | null;
};

type ApiBaseUrlEnv = {
  WEB_API_BASE_URL?: string | undefined;
  NEXT_PUBLIC_SITE_URL?: string | undefined;
};

export function resolveApiBaseUrl(
  env: ApiBaseUrlEnv,
  requestHeaders?: RequestHeaderStore | null,
): string {
  const configured = env.WEB_API_BASE_URL?.trim();

  if (configured) {
    return trimTrailingSlash(configured);
  }

  const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim();

  if (siteUrl) {
    return `${trimTrailingSlash(siteUrl)}/api`;
  }

  if (requestHeaders) {
    const host =
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");

    if (host) {
      const normalizedHost = host.split(",")[0]?.trim() ?? host.trim();
      const protocol =
        requestHeaders.get("x-forwarded-proto") ??
        (normalizedHost.includes("localhost") ? "http" : "https");
      return `${protocol}://${normalizedHost}/api`;
    }
  }

  return "http://localhost:3000/api";
}

export async function getApiBaseUrl(): Promise<string> {
  const headerStore = await headers();

  return resolveApiBaseUrl(
    {
      WEB_API_BASE_URL: process.env.WEB_API_BASE_URL,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    },
    headerStore,
  );
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}
