// Owner: apps/web. Compact transaction row for dashboard and mobile lists.
import type { TransactionRecord } from "@/lib/api";
import {
  formatDate,
  formatTransactionDescription,
  transactionDisplayAmount,
} from "@/lib/format";

type TransactionFeedItemProps = {
  actions?: React.ReactNode;
  transaction: TransactionRecord;
};

export function TransactionFeedItem({
  actions,
  transaction,
}: TransactionFeedItemProps) {
  const income = transaction.type === "income";
  const description = formatTransactionDescription(transaction.description);
  const amount = transactionDisplayAmount(transaction);
  const meta = transaction.merchant
    ? `${formatDate(transaction.transactionDate)} · ${transaction.merchant}`
    : `${formatDate(transaction.transactionDate)} · ${transaction.category}`;

  return (
    <article className="py-1.5 sm:py-2">
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate text-[13px] font-medium leading-5 text-ink sm:text-sm">
          {description}
        </p>
        <div
          className={`shrink-0 text-right text-[13px] font-semibold tabular-nums leading-5 sm:text-sm ${
            income ? "text-success" : "text-ink"
          }`}
        >
          <p>
            {income ? "+" : "−"}
            {amount.primary}
          </p>
          {amount.secondary ? (
            <p className="text-[10px] font-medium leading-3 text-ink-muted sm:text-[11px]">
              {amount.secondary}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[11px] leading-4 text-ink-muted sm:text-xs">
          {meta}
        </p>
        {actions}
      </div>
    </article>
  );
}
