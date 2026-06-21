// Owner: apps/web. Supabase SSR client helpers for auth session cookies.
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { CookieMethodsServer } from "@supabase/ssr";

type CookieStore = Awaited<ReturnType<typeof cookies>>;

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: createCookieMethods(cookieStore),
  });
}

function createCookieMethods(cookieStore: CookieStore) {
  return {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet: SupabaseCookiesToSet) {
      for (const { name, value, options } of cookiesToSet) {
        try {
          cookieStore.set(name, value, options);
        } catch {
          // Server Components cannot set cookies; middleware/server actions can.
        }
      }
    },
  };
}

type SupabaseCookiesToSet = Parameters<
  NonNullable<CookieMethodsServer["setAll"]>
>[0];

function getSupabaseUrl(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL");
}

function getSupabasePublishableKey(): string {
  return requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required for Supabase auth.`);
  }

  return value;
}
