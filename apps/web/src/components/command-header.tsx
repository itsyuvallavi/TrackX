// Owner: apps/web. Compact page heading and status rail for console views.
type CommandHeaderProps = {
  title: string;
  meta?: string;
};

export function CommandHeader({ title, meta }: CommandHeaderProps) {
  return (
    <section className="flex items-center justify-between gap-3 border-b border-surface-border pb-4 lg:pb-5">
      <h1 className="text-[2rem] font-semibold leading-tight tracking-normal text-ink">
        {title}
      </h1>
      {meta ? (
        <p className="rounded-full border border-surface-border bg-surface px-4 py-2 text-xs font-semibold text-ink-muted shadow-panel">
          {meta}
        </p>
      ) : null}
    </section>
  );
}
