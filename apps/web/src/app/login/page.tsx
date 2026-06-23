// Owner: apps/web. Email/password auth entrypoint for the TrackX dashboard.
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
    next?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-10">
      <section className="w-full max-w-md space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">
            TrackX
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">
            Sign in to TrackX
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Create an account, connect Telegram from Settings, then review
            expenses and budgets here.
          </p>
        </div>
        <form action={authenticate} className="panel panel-body space-y-4">
          <input
            type="hidden"
            name="next"
            value={params.next ?? "/dashboard"}
          />
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-ink">Email</span>
            <input className="field-input" name="email" required type="email" />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium text-ink">Password</span>
            <input
              className="field-input"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </label>
          {params.error ? (
            <p className="text-sm text-danger">{params.error}</p>
          ) : null}
          {params.message ? (
            <p className="text-sm text-success">{params.message}</p>
          ) : null}
          <p className="text-xs leading-5 text-ink-muted">
            New accounts use email confirmation. After confirming, TrackX will
            open Settings so you can connect Telegram.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              className="btn-primary"
              name="intent"
              type="submit"
              value="sign-in"
            >
              Sign in
            </button>
            <button
              className="btn-secondary"
              name="intent"
              type="submit"
              value="sign-up"
            >
              Create account
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

async function authenticate(formData: FormData) {
  "use server";

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const intent = String(formData.get("intent") ?? "sign-in");
  const nextPath = normalizeNextPath(String(formData.get("next") ?? ""));
  const supabase = await createSupabaseServerClient();
  const result =
    intent === "sign-up"
      ? await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${getSiteUrl()}/auth/callback` },
        })
      : await supabase.auth.signInWithPassword({ email, password });

  if (result.error) {
    redirect(`/login?error=${encodeURIComponent(result.error.message)}`);
  }

  redirect(
    intent === "sign-up"
      ? "/login?message=Check your email, then connect Telegram from Settings."
      : nextPath,
  );
}

function normalizeNextPath(value: string): string {
  return value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ??
    "https://track-x-web-two.vercel.app"
  );
}
