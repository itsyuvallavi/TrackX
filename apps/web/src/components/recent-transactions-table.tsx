// Owner: apps/web. Read-only recent transactions table for the dashboard.
import Link from "next/link";
import type { TransactionRecord } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";

type RecentTransactionsTableProps = {
  transactions: TransactionRecord[];
  limit?: number;
};

export function RecentTransactionsTable({
  transactions,
  limit = 10,
}: RecentTransactionsTableProps) {
  const rows = transactions.slice(0, limit);

  return (
    <section className="panel">
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Recent transactions</h2>
        <Link href="/transactions" className="text-sm font-medium text-accent">
          View all
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Type</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-6 text-center text-ink-muted">
                  No transactions yet.
                </td>
              </tr>
            ) : (
              rows.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{formatDate(transaction.transactionDate)}</td>
                  <td>
                    <div className="font-medium text-ink">
                      {transaction.description}
                    </div>
                    {transaction.merchant ? (
                      <div className="text-xs text-ink-muted">
                        {transaction.merchant}
                      </div>
                    ) : null}
                  </td>
                  <td>{transaction.category}</td>
                  <td className="capitalize">{transaction.type}</td>
                  <td
                    className={`text-right font-medium tabular-nums ${
                      transaction.type === "income"
                        ? "text-success"
                        : "text-ink"
                    }`}
                  >
                    {formatMoney(transaction.amount, transaction.currency)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
