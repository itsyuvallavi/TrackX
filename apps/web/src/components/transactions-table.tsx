// Owner: apps/web. Full transactions list with edit and delete actions.
"use client";

import { useState } from "react";
import type { TransactionRecord } from "@/lib/api";
import {
  formatDate,
  formatTransactionDescription,
  transactionDisplayAmount,
} from "@/lib/format";
import { DeleteTransactionButton } from "./delete-transaction-button";
import { EditTransactionForm } from "./edit-transaction-form";
import { TransactionFeedItem } from "./transaction-feed-item";

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

      <section className="panel overflow-hidden lg:hidden">
        <div className="divide-y divide-surface-border px-3 sm:px-4">
          {transactions.length === 0 ? (
            <EmptyTransactionsState compact />
          ) : (
            transactions.map((transaction) => (
              <TransactionFeedItem
                key={transaction.id}
                transaction={transaction}
                actions={
                  <TransactionRowActions
                    transaction={transaction}
                    onEdit={() => setEditingId(transaction.id)}
                  />
                }
              />
            ))
          )}
        </div>
      </section>

      <section className="panel hidden overflow-x-auto lg:block">
        <table className="data-table data-table-compact">
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
                <td colSpan={5} className="py-6">
                  <EmptyTransactionsState compact />
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <TransactionTableRow
                  key={transaction.id}
                  transaction={transaction}
                  onEdit={() => setEditingId(transaction.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function TransactionTableRow({
  transaction,
  onEdit,
}: {
  transaction: TransactionRecord;
  onEdit: () => void;
}) {
  const amount = transactionDisplayAmount(transaction);

  return (
    <tr>
      <td className="whitespace-nowrap text-xs text-ink-muted">
        {formatDate(transaction.transactionDate)}
      </td>
      <td>
        <div className="text-sm font-medium text-ink">
          {formatTransactionDescription(transaction.description)}
        </div>
        {transaction.merchant ? (
          <div className="text-xs text-ink-muted">{transaction.merchant}</div>
        ) : null}
      </td>
      <td className="text-xs text-ink-muted">{transaction.category}</td>
      <td
        className={`text-right text-sm font-semibold tabular-nums ${
          transaction.type === "income" ? "text-success" : "text-ink"
        }`}
      >
        <div>
          {transaction.type === "income" ? "+" : "−"}
          {amount.primary}
        </div>
        {amount.secondary ? (
          <div className="text-[11px] font-medium text-ink-muted">
            {amount.secondary}
          </div>
        ) : null}
      </td>
      <td>
        <TransactionRowActions
          transaction={transaction}
          onEdit={onEdit}
          className="justify-end"
        />
      </td>
    </tr>
  );
}

function TransactionRowActions({
  transaction,
  onEdit,
  className = "",
}: {
  transaction: TransactionRecord;
  onEdit: () => void;
  className?: string;
}) {
  const description = formatTransactionDescription(transaction.description);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        className="text-[10px] font-medium text-accent-dark hover:underline sm:text-xs"
        onClick={onEdit}
      >
        Edit
      </button>
      <DeleteTransactionButton
        transactionId={transaction.id}
        description={description}
        compact
      />
    </div>
  );
}

function EmptyTransactionsState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`border-accent/70 bg-accent-muted ${
        compact ? "py-4" : "panel rounded-[1.75rem] border shadow-panel"
      }`}
    >
      <div className={compact ? "" : "p-5"}>
        {!compact ? (
          <div className="grid size-10 place-items-center rounded-2xl bg-surface-inverse text-base font-black tracking-tight text-accent">
            X
          </div>
        ) : null}
        <h2
          className={`font-semibold text-ink ${compact ? "text-sm" : "mt-4 text-xl"}`}
        >
          Start with Telegram
        </h2>
        <p
          className={`text-ink-muted ${compact ? "mt-1 text-xs" : "mt-2 max-w-md text-sm leading-6"}`}
        >
          Send a message like “spent 4.50 euro on coffee”. New entries will show
          up here for review.
        </p>
      </div>
      {!compact ? (
        <div className="border-t border-accent/50 bg-surface/70 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-accent-dark">
          Waiting for the first entry
        </div>
      ) : null}
    </div>
  );
}
