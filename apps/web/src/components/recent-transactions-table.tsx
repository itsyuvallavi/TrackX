// Owner: apps/web. Read-only recent transactions table for the dashboard.
import Link from "next/link";
import type { TransactionRecord } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { TransactionFeedItem } from "./transaction-feed-item";
import { CategoryChip } from "./ui/chips";

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
    <section className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Recent entries</h2>
          <p className="text-xs text-ink-muted">
            Latest Telegram transactions.
          </p>
        </div>
        <Link
          href="/transactions"
          className="text-sm font-medium text-accent-dark"
        >
          View all
        </Link>
      </div>
      <div className="grid gap-3 p-3 md:hidden">
        {rows.length === 0 ? (
          <p className="px-1 py-4 text-sm text-ink-muted">
            No transactions yet.
          </p>
        ) : (
          rows.map((transaction) => (
            <TransactionFeedItem
              key={transaction.id}
              transaction={transaction}
            />
          ))
        )}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-ink-muted">
                  No transactions yet.
                </td>
              </tr>
            ) : (
              rows.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="whitespace-nowrap">
                    {formatDate(transaction.transactionDate)}
                  </td>
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
                  <td>
                    <CategoryChip category={transaction.category} />
                  </td>
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
