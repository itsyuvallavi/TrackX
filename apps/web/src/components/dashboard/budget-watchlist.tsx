// Owner: apps/web. Priority budget panel for categories that need attention.
import type { BudgetStatus } from "@trackx/shared";
import { budgetBarClass, formatMoney, formatPercent } from "@/lib/format";
import { StatusChip } from "../ui/chips";

type BudgetWatchlistProps = {
  budgets: BudgetStatus[];
};

export function BudgetWatchlist({ budgets }: BudgetWatchlistProps) {
  const priorityBudgets = rankBudgets(budgets).slice(0, 5);

  return (
    <section className="panel border-accent/70 bg-surface">
      <div className="panel-header flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Needs attention</h2>
          <p className="mt-1 text-xs font-medium text-ink-muted">
            Budgets closest to their limit.
          </p>
        </div>
        <span className="rounded-full bg-accent-muted px-3 py-1 text-xs font-semibold text-accent-dark">
          {priorityBudgets.filter((budget) => budget.status !== "ok").length}{" "}
          alerts
        </span>
      </div>
      <div className="divide-y divide-surface-border">
        {priorityBudgets.length === 0 ? (
          <div className="px-4 py-5">
            <p className="text-sm font-semibold text-ink">No spending yet</p>
            <p className="mt-1 text-sm text-ink-muted">
              Telegram entries will appear here once budgets have activity.
            </p>
          </div>
        ) : (
          priorityBudgets.map((budget) => (
            <WatchRow
              key={`${budget.period}-${budget.category}`}
              budget={budget}
            />
          ))
        )}
      </div>
    </section>
  );
}

function WatchRow({ budget }: { budget: BudgetStatus }) {
  const width = Math.min(budget.percentageUsed, 100);

  return (
    <article className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {budget.category}
          </p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-soft">
            {budget.period === "week" ? "This week" : "This month"}
          </p>
        </div>
        <StatusChip status={budget.status} />
      </div>
      <div className="mt-3 flex items-baseline justify-between gap-3">
        <p className="text-sm font-semibold tabular-nums text-ink">
          {formatMoney(budget.spentAmount, budget.currency)}
          <span className="font-normal text-ink-muted">
            {" "}
            / {formatMoney(budget.limitAmount, budget.currency)}
          </span>
        </p>
        <p className="text-xs font-medium text-ink-muted">
          {formatPercent(budget.percentageUsed)}
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-rail">
        <div
          className={`h-full rounded-full ${budgetBarClass(budget.status)}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        {formatMoney(budget.remainingAmount, budget.currency)} left
      </p>
    </article>
  );
}

function rankBudgets(budgets: BudgetStatus[]): BudgetStatus[] {
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
