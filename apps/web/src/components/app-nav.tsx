// Owner: apps/web. Top navigation for dashboard and transactions views.
import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
] as const;

type AppNavProps = {
  currentPath: string;
};

export function AppNav({ currentPath }: AppNavProps) {
  return (
    <header className="border-b border-surface-border bg-surface">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">
            TrackX
          </p>
          <h1 className="text-lg font-semibold text-ink">Spend overview</h1>
        </div>
        <nav className="flex items-center gap-1">
          {links.map((link) => {
            const active = currentPath === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-md px-3 py-2 text-sm font-medium ${
                  active
                    ? "bg-accent-muted text-accent"
                    : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
