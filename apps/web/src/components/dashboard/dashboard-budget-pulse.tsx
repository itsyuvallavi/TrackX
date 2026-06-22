// Owner: apps/web. Single dashboard budget panel with week/month toggle.
"use client";

import Link from "next/link";
import { useState } from "react";
import type { BudgetPeriod, BudgetStatus } from "@trackx/shared";
import {
  BudgetProgressRow,
  sortBudgetsForDisplay,
} from "@/components/budget-progress-row";

type DashboardBudgetPulseProps = {
  weeklyBudgets: BudgetStatus[];
  monthlyBudgets: BudgetStatus[];
};

export function DashboardBudgetPulse({
  weeklyBudgets,
  monthlyBudgets,
}: DashboardBudgetPulseProps) {
  const [period, setPeriod] = useState<BudgetPeriod>("week");
  const budgets = period === "week" ? weeklyBudgets : monthlyBudgets;
  const displayBudgets = sortBudgetsForDisplay(budgets);
  const alertCount = displayBudgets.filter(
    (budget) => budget.status !== "ok",
  ).length;

  return (
    <section className="panel flex flex-col overflow-hidden bg-surface">
      <div className="panel-header flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-4">
        <div>
          <h2 className="text-xs font-semibold text-ink sm:text-sm">Budgets</h2>
          <p className="mt-0.5 hidden text-xs font-medium text-ink-muted sm:mt-1 sm:block">
            Category limits and spending this period.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {alertCount > 0 ? (
            <span className="rounded-full bg-warning-muted px-3 py-1 text-xs font-semibold text-warning">
              {alertCount} alert{alertCount === 1 ? "" : "s"}
            </span>
          ) : null}
          <PeriodToggle period={period} onChange={setPeriod} />
        </div>
      </div>

      <div className="h-80 divide-y divide-surface-border overflow-y-auto overscroll-y-contain px-3 py-2.5 sm:h-[22rem] sm:px-4 sm:py-3 [scrollbar-gutter:stable]">
        {displayBudgets.length === 0 ? (
          <p className="py-5 text-sm text-ink-muted">
            No budgets set for this period yet. Add limits in Settings.
          </p>
        ) : (
          displayBudgets.map((budget) => (
            <BudgetProgressRow
              key={`${budget.period}-${budget.category}`}
              budget={budget}
            />
          ))
        )}
      </div>

      <div className="border-t border-surface-border px-3 py-2 sm:px-4 sm:py-3">
        <Link
          href="/settings"
          className="text-xs font-medium text-accent-dark hover:underline sm:text-sm"
        >
          All budgets & limits →
        </Link>
      </div>
    </section>
  );
}

function PeriodToggle({
  period,
  onChange,
}: {
  period: BudgetPeriod;
  onChange: (period: BudgetPeriod) => void;
}) {
  return (
    <div className="flex rounded-full border border-surface-border bg-surface-muted p-0.5">
      {(["week", "month"] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            period === value
              ? "bg-surface-inverse text-white"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          {value === "week" ? "Week" : "Month"}
        </button>
      ))}
    </div>
  );
}
