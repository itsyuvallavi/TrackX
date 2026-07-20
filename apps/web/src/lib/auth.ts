// Owner: apps/web. Server-side Neon Auth boundary for protected app routes.
import { redirect } from "next/navigation";
import { getUserRepository } from "@/lib/api-route-runtime";
import { getNeonAuth } from "@/lib/neon-auth";

export type AuthenticatedUser = {
  id: string;
  email: string | null;
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const { data: session, error } = await getNeonAuth().getSession();

  if (error || !session?.user) {
    return null;
  }

  const email = session.user.email ?? null;
  const user = await getUserRepository().ensureAuthUser({
    provider: "neon",
    providerUserId: session.user.id,
    email,
  });

  return {
    id: user.id,
    email,
  };
}

export async function requireAuthenticatedUser(): Promise<AuthenticatedUser> {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
