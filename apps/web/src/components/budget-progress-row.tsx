// Owner: apps/web. Shared budget progress row for dashboard and lists.
"use client";

import type { BudgetStatus } from "@trackx/shared";
import { AnimatedMoney } from "@/components/animated-money";
import { AnimatedProgressBar } from "@/components/animated-progress-bar";
import { budgetBarClass, formatMoney, formatPercent } from "@/lib/format";
import { StatusChip } from "./ui/chips";

type BudgetProgressRowProps = {
  budget: BudgetStatus;
  showPeriod?: boolean;
};

export function BudgetProgressRow({
  budget,
  showPeriod = false,
}: BudgetProgressRowProps) {
  const width = Math.min(budget.percentageUsed, 100);

  return (
    <article className="py-2 sm:py-2.5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-ink sm:text-sm">
            {budget.category}
          </p>
          {showPeriod ? (
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-ink-soft">
              {budget.period === "week" ? "This week" : "This month"}
            </p>
          ) : null}
        </div>
        {budget.status === "ok" ? null : <StatusChip status={budget.status} />}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2 sm:mt-2 sm:gap-3">
        <p className="text-xs font-semibold tabular-nums text-ink sm:text-sm">
          <AnimatedMoney
            amount={budget.spentAmount}
            currency={budget.currency}
          />
          <span className="font-normal text-ink-muted">
            {" "}
            / {formatMoney(budget.limitAmount, budget.currency)}
          </span>
        </p>
        <p className="text-[10px] font-medium text-ink-muted sm:text-xs">
          {formatPercent(budget.percentageUsed)}
        </p>
      </div>
      <AnimatedProgressBar
        value={width}
        trackClassName="mt-1 h-1 overflow-hidden rounded-full bg-surface-rail sm:mt-2 sm:h-1.5"
        barClassName={`h-full rounded-full ${budgetBarClass(budget.status)}`}
      />
    </article>
  );
}

export function rankPulseBudgets(budgets: BudgetStatus[]): BudgetStatus[] {
  return budgets
    .filter((budget) => budget.spentAmount > 0 || budget.status !== "ok")
    .sort((a, b) => {
      const statusDelta = statusRank(b) - statusRank(a);

      if (statusDelta !== 0) {
        return statusDelta;
      }

      return b.percentageUsed - a.percentageUsed;
    });
}

export function sortBudgetsForDisplay(budgets: BudgetStatus[]): BudgetStatus[] {
  return [...budgets].sort((a, b) => {
    const statusDelta = statusRank(b) - statusRank(a);

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return b.percentageUsed - a.percentageUsed;
  });
}

function statusRank(budget: BudgetStatus): number {
  switch (budget.status) {
    case "over":
      return 3;
    case "warning":
      return 2;
    case "ok":
      return 1;
  }
}
