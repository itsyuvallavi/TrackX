// Owner: apps/web. Full transactions table with edit and delete actions.
"use client";

import { useMemo, useState } from "react";
import type { TransactionRecord } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/format";
import { DeleteTransactionButton } from "./delete-transaction-button";
import { EditTransactionForm } from "./edit-transaction-form";

type TransactionsTableProps = {
  transactions: TransactionRecord[];
};

export function TransactionsTable({ transactions }: TransactionsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingTransaction = useMemo(
    () => transactions.find((transaction) => transaction.id === editingId),
    [editingId, transactions],
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

      <section className="panel overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Type</th>
              <th className="text-right">Amount</th>
              <th>Source</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-ink-muted">
                  No transactions yet. Log expenses through Telegram or the API.
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
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
                  <td className="capitalize">{transaction.source}</td>
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
