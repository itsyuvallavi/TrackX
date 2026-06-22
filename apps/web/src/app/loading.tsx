// Owner: apps/web. Lightweight route loading state for authenticated pages.
export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-4 lg:space-y-6 lg:py-6">
      <div className="h-10 w-40 animate-pulse rounded-full bg-surface-rail" />
      <section className="overflow-hidden rounded-[2rem] border border-surface-inverse bg-surface-inverse p-5 shadow-panel">
        <div className="h-4 w-24 animate-pulse rounded-full bg-accent/60" />
        <div className="mt-5 h-12 w-44 animate-pulse rounded-full bg-white/20" />
        <div className="mt-5 h-2 animate-pulse rounded-full bg-white/15" />
      </section>
      <section className="panel p-5">
        <div className="h-4 w-32 animate-pulse rounded-full bg-surface-rail" />
        <div className="mt-4 h-16 animate-pulse rounded-3xl bg-surface-muted" />
      </section>
    </main>
  );
}
