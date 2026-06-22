// Owner: apps/web. Client-side animated progress bar for budget rails.
"use client";

import { useEffect, useState } from "react";

type AnimatedProgressBarProps = {
  value: number;
  trackClassName?: string;
  barClassName?: string;
  durationMs?: number;
};

export function AnimatedProgressBar({
  value,
  trackClassName = "h-1.5 overflow-hidden rounded-full bg-surface-rail",
  barClassName = "h-full rounded-full bg-accent",
  durationMs = 720,
}: AnimatedProgressBarProps) {
  const target = Math.min(Math.max(value, 0), 100);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setWidth(target);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - startedAt) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setWidth(target * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    }

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [durationMs, target]);

  return (
    <div className={trackClassName}>
      <div className={barClassName} style={{ width: `${width}%` }} />
    </div>
  );
}
