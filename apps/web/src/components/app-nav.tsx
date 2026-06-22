// Owner: apps/web. Desktop top navigation for authenticated console views.
import Link from "next/link";
import { ProfileMenu } from "./profile-menu";

export const appLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
] as const;

export type AppLink = (typeof appLinks)[number];

type AppNavProps = {
  currentPath: string;
};

export function AppNav({ currentPath }: AppNavProps) {
  return (
    <header className="border-b border-surface-border bg-surface/95 text-ink backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 lg:py-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-surface-inverse text-sm font-black tracking-tight text-accent shadow-panel">
            X
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-dark">
              TrackX
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-1 lg:flex">
            {appLinks.map((link) => {
              const active = currentPath === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-2xl px-4 py-2 text-sm font-medium ${
                    active
                      ? "bg-surface-inverse text-accent shadow-panel"
                      : "text-ink-muted transition-colors duration-150 ease-trackx-out hover:bg-accent-muted hover:text-accent-dark"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
