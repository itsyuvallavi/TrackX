// Owner: apps/web. Full transactions table with edit and delete actions.
"use client";

import { useState } from "react";
import type { TransactionRecord } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { DeleteTransactionButton } from "./delete-transaction-button";
import { EditTransactionForm } from "./edit-transaction-form";
import { TransactionFeedItem } from "./transaction-feed-item";
import { CategoryChip } from "./ui/chips";

type TransactionsTableProps = {
  transactions: TransactionRecord[];
};

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingTransaction = transactions.find(
    (transaction) => transaction.id === editingId,
  );

  return (
    <div className="space-y-4">
      {editingTransaction ? (
        <EditTransactionForm
          transaction={editingTransaction}
          onCancel={() => setEditingId(null)}
          onSaved={() => setEditingId(null)}
        />
      ) : null}

      <section className="grid gap-3 lg:hidden">
        {transactions.length === 0 ? (
          <EmptyTransactionsState />
        ) : (
          transactions.map((transaction) => (
            <TransactionFeedItem
              key={transaction.id}
              transaction={transaction}
              actions={
                <>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setEditingId(transaction.id)}
                  >
                    Edit
                  </button>
                  <DeleteTransactionButton
                    transactionId={transaction.id}
                    description={transaction.description}
                  />
                </>
              }
            />
          ))
        )}
      </section>

      <section className="panel hidden overflow-x-auto lg:block">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10">
                  <EmptyTransactionsState compact />
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
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
                  <td>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setEditingId(transaction.id)}
                      >
                        Edit
                      </button>
                      <DeleteTransactionButton
                        transactionId={transaction.id}
                        description={transaction.description}
                      />
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function EmptyTransactionsState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`panel border-accent/70 bg-accent-muted ${
        compact ? "mx-auto max-w-xl" : ""
      }`}
    >
      <div className="p-5">
        <div className="grid size-12 place-items-center rounded-2xl bg-surface-inverse text-lg font-black tracking-tight text-accent">
          X
        </div>
        <h2 className="mt-5 text-xl font-semibold text-ink">
          Start with Telegram
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-ink-muted">
          Send a message like “spent 4.50 euro on coffee”. New entries will show
          up here for review.
        </p>
      </div>
      <div className="border-t border-accent/50 bg-surface/70 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-accent-dark">
        Waiting for the first entry
      </div>
    </div>
  );
}
