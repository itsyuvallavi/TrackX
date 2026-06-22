// Owner: apps/web. Account menu with settings and logout actions.
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        aria-expanded={open}
        aria-label="Open profile menu"
        className="grid size-10 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-dark shadow-panel transition duration-300 ease-trackx-out hover:scale-[1.03] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        type="button"
        onClick={() => setOpen((current) => !current)}
      >
        Y
      </button>
      <div
        aria-hidden={!open}
        className={`absolute right-0 top-12 z-30 w-44 origin-top-right overflow-hidden rounded-3xl border border-surface-border bg-surface shadow-panel transition duration-[320ms] ease-trackx-out ${
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0"
        }`}
      >
        <Link
          href="/settings"
          className="block px-4 py-3 text-sm font-semibold text-ink transition-colors duration-150 ease-trackx-out hover:bg-accent-muted"
          tabIndex={open ? 0 : -1}
          onClick={() => setOpen(false)}
        >
          Settings
        </Link>
        <form action="/auth/logout" method="post">
          <button
            className="block w-full px-4 py-3 text-left text-sm font-semibold text-ink-muted transition-colors duration-150 ease-trackx-out hover:bg-surface-muted hover:text-ink"
            type="submit"
            tabIndex={open ? 0 : -1}
          >
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
