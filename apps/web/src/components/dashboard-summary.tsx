// Owner: apps/web. Monthly income, expense, and net summary cards.
import type { Currency } from "@trackx/shared";
import { formatMoney } from "@/lib/format";

type DashboardSummaryProps = {
  income: number;
  expenses: number;
  net: number;
  currency: Currency;
};

export function DashboardSummary({
  income,
  expenses,
  net,
  currency,
}: DashboardSummaryProps) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <article className="panel panel-body">
        <p className="stat-label">Income</p>
        <p className="stat-value text-success">
          {formatMoney(income, currency)}
        </p>
      </article>
      <article className="panel panel-body">
        <p className="stat-label">Expenses</p>
        <p className="stat-value text-danger">
          {formatMoney(expenses, currency)}
        </p>
      </article>
      <article className="panel panel-body">
        <p className="stat-label">Net</p>
        <p
          className={`stat-value ${net >= 0 ? "text-success" : "text-danger"}`}
        >
          {formatMoney(net, currency)}
        </p>
      </article>
    </section>
  );
}
