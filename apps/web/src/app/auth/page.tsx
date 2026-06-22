// Owner: apps/web. Auth route placeholder that preserves current login flow.
import Link from "next/link";

export default function AuthPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-muted px-4 py-10">
      <section className="w-full max-w-md space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">
            TrackX
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-ink">
            Authentication space
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            This route is reserved for the future auth shell. The current email
            sign-in flow stays on the login route.
          </p>
        </div>
        <div className="panel panel-body space-y-4">
          <div className="rounded-md border border-surface-border bg-surface-muted p-4 text-sm text-ink-muted">
            Supabase email auth is already wired. Provider selection and a full
            account menu remain separate product slices.
          </div>
          <Link className="btn-primary w-full" href="/login">
            Continue to login
          </Link>
        </div>
      </section>
    </main>
  );
}
