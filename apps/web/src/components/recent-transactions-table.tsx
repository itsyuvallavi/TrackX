// Owner: apps/web. Read-only recent transactions list for the dashboard.
import Link from "next/link";
import type { TransactionRecord } from "@/lib/api";
import { TransactionFeedItem } from "./transaction-feed-item";

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
      <div className="flex items-center justify-between border-b border-surface-border px-3 py-1.5 sm:px-4 sm:py-2">
        <h2 className="text-xs font-semibold text-ink sm:text-sm">
          Recent entries
        </h2>
        <Link
          href="/transactions"
          className="text-[11px] font-medium text-accent-dark hover:underline sm:text-xs"
        >
          View all
        </Link>
      </div>
      <div className="divide-y divide-surface-border px-3 sm:px-4">
        {rows.length === 0 ? (
          <p className="py-3 text-xs text-ink-muted sm:py-4 sm:text-sm">
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
    </section>
  );
}
