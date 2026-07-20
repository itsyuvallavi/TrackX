// Owner: apps/web. Lazy Neon Auth server boundary for routes, actions, and proxy.
import { createNeonAuth, type NeonAuth } from "@neondatabase/auth/next/server";

let auth: NeonAuth | undefined;

export function getNeonAuth(): NeonAuth {
  auth ??= createNeonAuth({
    baseUrl: requireEnv("NEON_AUTH_BASE_URL"),
    cookies: {
      secret: requireEnv("NEON_AUTH_COOKIE_SECRET"),
      sessionDataTtl: 300,
      sameSite: "strict",
    },
  });

  return auth;
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for Neon Auth.`);
  }

  return value;
}
