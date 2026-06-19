// Owner: apps/web. Budget progress list for weekly and monthly periods.
import type { BudgetStatus } from "@trackx/shared";
import {
  budgetBarClass,
  budgetStatusClass,
  budgetStatusLabel,
  formatMoney,
  formatPercent,
} from "@/lib/format";

type BudgetListProps = {
  title: string;
  budgets: BudgetStatus[];
  emptyMessage?: string;
};

export function BudgetList({
  title,
  budgets,
  emptyMessage = "No active budgets for this period.",
}: BudgetListProps) {
  return (
    <section className="panel">
      <div className="panel-header">{title}</div>
      <div className="panel-body space-y-4">
        {budgets.length === 0 ? (
          <p className="text-sm text-ink-muted">{emptyMessage}</p>
        ) : (
          budgets.map((budget) => {
            const width = Math.min(budget.percentageUsed, 100);

            return (
              <article key={`${budget.period}-${budget.category}`}>
                <div className="mb-1 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {budget.category}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {formatMoney(budget.spentAmount, budget.currency)} of{" "}
                      {formatMoney(budget.limitAmount, budget.currency)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${budgetStatusClass(budget.status)}`}
                  >
                    {budgetStatusLabel(budget.status)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className={`h-full rounded-full ${budgetBarClass(budget.status)}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {formatPercent(budget.percentageUsed)} used ·{" "}
                  {formatMoney(budget.remainingAmount, budget.currency)} left
                </p>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
