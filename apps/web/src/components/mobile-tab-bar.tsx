// Owner: apps/web. Animated mobile tab navigation for primary app routes.
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AppLink } from "./app-nav";

type MobileTabBarProps = {
  currentPath: string;
  links: readonly AppLink[];
};

export function MobileTabBar({ currentPath, links }: MobileTabBarProps) {
  const [activePath, setActivePath] = useState(currentPath);
  const activeIndex = Math.max(
    links.findIndex((link) => link.href === activePath),
    0,
  );

  useEffect(() => {
    setActivePath(currentPath);
  }, [currentPath]);

  return (
    <nav className="fixed inset-x-4 bottom-3 z-20 mx-auto max-w-sm rounded-2xl border border-white/70 bg-white/80 p-1 shadow-panel backdrop-blur-xl sm:inset-x-5 sm:bottom-4 sm:rounded-[1.65rem] sm:p-1.5 lg:hidden">
      <div
        className="relative grid items-center gap-1"
        style={{
          gridTemplateColumns: `repeat(${links.length}, minmax(0, 1fr))`,
        }}
      >
        <span
          aria-hidden="true"
          className="absolute inset-y-0 left-0 rounded-[1.35rem] bg-surface-inverse shadow-panel transition-transform duration-[420ms] ease-trackx-out"
          style={{
            width: `${100 / links.length}%`,
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
        {links.map((link) => {
          const active = activePath === link.href;
          const label = link.href === "/dashboard" ? "Home" : link.label;

          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setActivePath(link.href)}
              className={`relative z-10 flex min-h-9 items-center justify-center rounded-2xl px-2 text-sm font-semibold transition duration-[420ms] ease-trackx-out active:scale-[0.97] sm:min-h-10 sm:rounded-[1.35rem] sm:px-3 sm:text-[0.95rem] ${
                active ? "text-accent" : "text-ink-muted"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
