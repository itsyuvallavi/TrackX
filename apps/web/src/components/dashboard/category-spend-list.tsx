// Owner: apps/web. Compact category spending list for dashboard review.
import type { BudgetStatus } from "@trackx/shared";
import { budgetBarClass, formatMoney, formatPercent } from "@/lib/format";

type CategorySpendListProps = {
  budgets: BudgetStatus[];
};

export function CategorySpendList({ budgets }: CategorySpendListProps) {
  const activeBudgets = budgets
    .filter((budget) => budget.spentAmount > 0)
    .sort((a, b) => b.spentAmount - a.spentAmount)
    .slice(0, 6);

  return (
    <section className="panel border-surface-border bg-surface">
      <div className="panel-header">
        <h2 className="text-sm font-semibold text-ink">
          This month by category
        </h2>
        <p className="mt-1 text-xs font-medium text-ink-muted">
          Highest active spending areas.
        </p>
      </div>
      <div className="space-y-4 p-4">
        {activeBudgets.length === 0 ? (
          <p className="text-sm text-ink-muted">
            No category spending this month.
          </p>
        ) : (
          activeBudgets.map((budget) => (
            <CategoryRow key={budget.category} budget={budget} />
          ))
        )}
      </div>
    </section>
  );
}

function CategoryRow({ budget }: { budget: BudgetStatus }) {
  const width = Math.min(budget.percentageUsed, 100);

  return (
    <article>
      <div className="flex items-baseline justify-between gap-3">
        <p className="truncate text-sm font-semibold text-ink">
          {budget.category}
        </p>
        <p className="text-sm font-semibold tabular-nums text-ink">
          {formatMoney(budget.spentAmount, budget.currency)}
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-rail">
        <div
          className={`h-full rounded-full ${budgetBarClass(budget.status)}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        {formatPercent(budget.percentageUsed)} of{" "}
        {formatMoney(budget.limitAmount, budget.currency)}
      </p>
    </article>
  );
}
