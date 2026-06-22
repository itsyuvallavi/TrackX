// Owner: apps/web. Mobile-friendly transaction feed row.
import type { TransactionRecord } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { CategoryChip } from "./ui/chips";

type TransactionFeedItemProps = {
  actions?: React.ReactNode;
  transaction: TransactionRecord;
};

export function TransactionFeedItem({
  actions,
  transaction,
}: TransactionFeedItemProps) {
  const income = transaction.type === "income";

  return (
    <article className="panel panel-body space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">
            {transaction.description}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {transaction.merchant ?? formatDate(transaction.transactionDate)}
          </p>
        </div>
        <p
          className={`shrink-0 text-sm font-semibold tabular-nums ${
            income ? "text-success" : "text-ink"
          }`}
        >
          {income ? "+" : "-"}
          {formatMoney(transaction.amount, transaction.currency)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CategoryChip category={transaction.category} />
      </div>
      {actions ? (
        <div className="grid grid-cols-2 gap-2 pt-1">{actions}</div>
      ) : null}
    </article>
  );
}
