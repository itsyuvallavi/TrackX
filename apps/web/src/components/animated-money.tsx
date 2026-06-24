// Owner: apps/web. Client-side animated money display for dashboard metrics.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Currency } from "@trackx/shared";

type AnimatedMoneyProps = {
  amount: number;
  currency: Currency;
  className?: string;
  animation?: "always" | "mount" | "none";
};

export function AnimatedMoney({
  amount,
  animation = "always",
  currency,
  className,
}: AnimatedMoneyProps) {
  const hasAnimatedRef = useRef(false);
  const [displayAmount, setDisplayAmount] = useState(
    animation === "none" ? amount : 0,
  );
  const formatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }),
    [currency],
  );

  useEffect(() => {
    const shouldAnimate =
      animation === "always" ||
      (animation === "mount" && !hasAnimatedRef.current);

    if (!shouldAnimate) {
      setDisplayAmount(amount);
      return;
    }

    hasAnimatedRef.current = true;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayAmount(amount);
      return;
    }

    let frame = 0;
    const duration = 720;
    const startedAt = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      setDisplayAmount(amount * eased);

      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      }
    }

    frame = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frame);
  }, [amount, animation]);

  return <span className={className}>{formatter.format(displayAmount)}</span>;
}
