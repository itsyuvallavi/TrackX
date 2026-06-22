// Owner: apps/web. Responsive budget board with weekly and monthly budget rails.
import type { BudgetStatus } from "@trackx/shared";
import { budgetBarClass, formatMoney, formatPercent } from "@/lib/format";
import { StatusChip } from "./ui/chips";

type BudgetBoardProps = {
  monthlyBudgets: BudgetStatus[];
  weeklyBudgets: BudgetStatus[];
};

export function BudgetBoard({
  monthlyBudgets,
  weeklyBudgets,
}: BudgetBoardProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">All budget limits</h2>
          <p className="text-xs text-ink-muted">
            Full weekly and monthly limits.
          </p>
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <BudgetPeriod title="This week" budgets={weeklyBudgets} />
        <BudgetPeriod title="This month" budgets={monthlyBudgets} />
      </div>
    </section>
  );
}

function BudgetPeriod({
  budgets,
  title,
}: {
  budgets: BudgetStatus[];
  title: string;
}) {
  return (
    <section className="panel bg-surface/80">
      <div className="panel-header flex items-center justify-between gap-3">
        <span>{title}</span>
        <span className="text-xs font-medium text-ink-muted">
          {budgets.length} active
        </span>
      </div>
      <div className="divide-y divide-surface-border">
        {budgets.length === 0 ? (
          <p className="px-4 py-6 text-sm text-ink-muted">
            No active budgets for this period.
          </p>
        ) : (
          budgets.map((budget) => (
            <BudgetRow
              key={`${budget.period}-${budget.category}`}
              budget={budget}
            />
          ))
        )}
      </div>
    </section>
  );
}

function BudgetRow({ budget }: { budget: BudgetStatus }) {
  const width = Math.min(budget.percentageUsed, 100);

  return (
    <article className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {budget.category}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {formatMoney(budget.spentAmount, budget.currency)} of{" "}
            {formatMoney(budget.limitAmount, budget.currency)}
          </p>
        </div>
        {budget.status === "ok" ? null : <StatusChip status={budget.status} />}
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-rail">
        <div
          className={`h-full rounded-full ${budgetBarClass(budget.status)}`}
          style={{ width: `${width}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-ink-muted">
        {formatPercent(budget.percentageUsed)} used ·{" "}
        {formatMoney(budget.remainingAmount, budget.currency)} left
      </p>
    </article>
  );
}
