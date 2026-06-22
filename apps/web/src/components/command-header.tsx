// Owner: apps/web. Compact page heading and status rail for console views.
type CommandHeaderProps = {
  title: string;
  meta?: string;
};

export function CommandHeader({ title, meta }: CommandHeaderProps) {
  return (
    <section className="flex items-center justify-between gap-2 border-b border-surface-border pb-3 sm:gap-3 sm:pb-4 lg:pb-5">
      <h1 className="text-xl font-semibold leading-tight tracking-normal text-ink sm:text-[2rem]">
        {title}
      </h1>
      {meta ? (
        <p className="hidden rounded-full border border-surface-border bg-surface px-3 py-1.5 text-[11px] font-semibold text-ink-muted shadow-panel sm:inline-flex sm:px-4 sm:py-2 sm:text-xs">
          {meta}
        </p>
      ) : null}
    </section>
  );
}
