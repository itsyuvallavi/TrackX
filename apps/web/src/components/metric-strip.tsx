// Owner: apps/web. Scan-first financial metric strip for dashboard totals.
import type { BudgetStatus, Currency } from "@trackx/shared";
import { formatMoney } from "@/lib/format";
import { AnimatedMoney } from "./animated-money";

type MetricStripProps = {
  income: number;
  expenses: number;
  weekExpenses: number;
  weeklyBudgets: BudgetStatus[];
  monthlyBudgets: BudgetStatus[];
  currency: Currency;
};

export function MetricStrip({
  income,
  expenses,
  weekExpenses,
  weeklyBudgets,
  monthlyBudgets,
  currency,
}: MetricStripProps) {
  const weeklyLimit = sumBudgets(weeklyBudgets, "limitAmount");
  const weeklyLeft = sumBudgets(weeklyBudgets, "remainingAmount");
  const topCategory = monthlyBudgets
    .filter((budget) => budget.spentAmount > 0)
    .sort((a, b) => b.spentAmount - a.spentAmount)[0];

  return (
    <section className="space-y-3">
      <article className="overflow-hidden rounded-[2rem] border border-surface-inverse bg-surface-inverse text-white shadow-panel">
        <div className="flex items-start justify-between gap-4 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-accent">
              Spent this week
            </p>
            <AnimatedMoney
              amount={weekExpenses}
              currency={currency}
              className="mt-3 block text-[2.75rem] font-semibold leading-none tracking-normal text-white"
            />
            <p className="mt-3 max-w-[18rem] text-sm leading-6 text-white/70">
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
          <p className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-dark">
            {formatMoney(Math.max(weeklyLeft, 0), currency)} left
          </p>
        </div>
        <div className="px-5 pb-5">
          <div className="h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-accent"
              style={{
                width:
                  weeklyLimit > 0
                    ? `${Math.min((weekExpenses / weeklyLimit) * 100, 100)}%`
                    : "0%",
              }}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <SmallDarkMetric
              label="Month spent"
              amount={expenses}
              currency={currency}
            />
            <SmallDarkMetric
              label="Top category"
              text={topCategory?.category ?? "None yet"}
            />
          </div>
        </div>
      </article>

      {income > 0 ? (
        <p className="px-1 text-xs font-medium text-ink-muted">
          Month income: {formatMoney(income, currency)}
        </p>
      ) : null}
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
    <div className="rounded-3xl bg-white/10 p-3">
      <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-white/50">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-white">
        {currency && amount !== undefined ? (
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
