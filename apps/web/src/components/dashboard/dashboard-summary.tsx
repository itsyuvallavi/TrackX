// Owner: apps/web. Scan-first weekly hero with compact month metric.
"use client";

import type { BudgetStatus, Currency } from "@trackx/shared";
import { AnimatedMoney } from "@/components/animated-money";
import { AnimatedProgressBar } from "@/components/animated-progress-bar";
import { formatMoney } from "@/lib/format";

type DashboardSummaryProps = {
  weekExpenses: number;
  monthExpenses: number;
  income: number;
  weeklyBudgets: BudgetStatus[];
  currency: Currency;
};

export function DashboardSummary({
  weekExpenses,
  monthExpenses,
  income,
  weeklyBudgets,
  currency,
}: DashboardSummaryProps) {
  const weeklyLimit = sumBudgets(weeklyBudgets, "limitAmount");
  const weeklyLeft = sumBudgets(weeklyBudgets, "remainingAmount");
  const weekProgress =
    weeklyLimit > 0 ? Math.min((weekExpenses / weeklyLimit) * 100, 100) : 0;

  return (
    <section className="space-y-2 sm:space-y-3">
      <article className="overflow-hidden rounded-[1.5rem] border border-surface-inverse bg-surface-inverse text-white shadow-panel sm:rounded-[2rem]">
        <div className="flex items-start justify-between gap-3 p-4 sm:gap-4 sm:p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-accent sm:text-xs">
              Spent this week
            </p>
            <AnimatedMoney
              amount={weekExpenses}
              currency={currency}
              className="mt-2 block text-[2rem] font-semibold leading-none tracking-normal text-white sm:mt-3 sm:text-[2.75rem]"
            />
            <p className="mt-2 max-w-[18rem] text-xs leading-5 text-white/70 sm:mt-3 sm:text-sm sm:leading-6">
              {weeklyLimit > 0
                ? `${formatMoney(weeklyLeft, currency)} left from ${formatMoney(
                    weeklyLimit,
                    currency,
                  )}.`
                : weekExpenses > 0
                  ? "No weekly limit set yet."
                  : "No spending logged this week."}
            </p>
          </div>
          <p className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-semibold text-accent-dark sm:px-3 sm:py-1 sm:text-xs">
            {formatMoney(Math.max(weeklyLeft, 0), currency)} left
          </p>
        </div>

        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <AnimatedProgressBar
            value={weekProgress}
            trackClassName="h-2 overflow-hidden rounded-full bg-white/15"
            barClassName="h-full rounded-full bg-accent"
          />
          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:mt-4 sm:gap-2">
            <SmallDarkMetric
              label="Month spent"
              amount={monthExpenses}
              currency={currency}
            />
            {income > 0 ? (
              <SmallDarkMetric
                label="Month income"
                amount={income}
                currency={currency}
              />
            ) : (
              <SmallDarkMetric label="Month income" text="None yet" />
            )}
          </div>
        </div>
      </article>
    </section>
  );
}

function SmallDarkMetric({
  amount,
  currency,
  label,
  text,
}: {
  amount?: number;
  currency?: Currency;
  label: string;
  text?: string;
}) {
  return (
    <div className="rounded-2xl bg-white/10 p-2.5 sm:rounded-3xl sm:p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50 sm:text-[0.7rem]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-semibold text-white sm:mt-1 sm:text-sm">
        {currency !== undefined && amount !== undefined ? (
          <AnimatedMoney amount={amount} currency={currency} />
        ) : (
          text
        )}
      </p>
    </div>
  );
}

function sumBudgets(
  budgets: BudgetStatus[],
  key: "limitAmount" | "remainingAmount",
): number {
  return budgets.reduce((total, budget) => total + budget[key], 0);
}
