// Owner: apps/web. Edit transaction form backed by server actions.
"use client";

import { useState, useTransition } from "react";
import {
  CATEGORY_NAMES,
  CURRENCIES,
  type CategoryName,
  type Currency,
  type UpdateTransactionInput,
} from "@trackx/shared";
import type { TransactionRecord } from "@/lib/api";
import { updateTransactionAction } from "@/lib/actions";

type EditTransactionFormProps = {
  transaction: TransactionRecord;
  onCancel: () => void;
  onSaved: () => void;
};

export function EditTransactionForm({
  transaction,
  onCancel,
  onSaved,
}: EditTransactionFormProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [amount, setAmount] = useState(String(transaction.amount));
  const [currency, setCurrency] = useState<Currency>(transaction.currency);
  const [category, setCategory] = useState<CategoryName>(transaction.category);
  const [description, setDescription] = useState(transaction.description);
  const [merchant, setMerchant] = useState(transaction.merchant ?? "");
  const [transactionDate, setTransactionDate] = useState(
    transaction.transactionDate,
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Amount must be a positive number.");
      return;
    }

    const input: UpdateTransactionInput = {
      amount: parsedAmount,
      currency,
      category,
      description: description.trim(),
      merchant: merchant.trim() ? merchant.trim() : null,
      transactionDate,
    };

    startTransition(async () => {
      const result = await updateTransactionAction(transaction.id, input);

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onSaved();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="panel panel-body space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink">Edit transaction</h3>
          <p className="text-xs text-ink-muted">
            Update the stored ledger entry.
          </p>
        </div>
        <p className="rounded-md bg-surface-muted px-2 py-1 text-xs font-medium capitalize text-ink-muted">
          {transaction.type}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="field-label">Description</span>
          <input
            className="field-input"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="field-label">Merchant</span>
          <input
            className="field-input"
            value={merchant}
            onChange={(event) => setMerchant(event.target.value)}
          />
        </label>

        <label className="block">
          <span className="field-label">Amount</span>
          <input
            className="field-input"
            type="number"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            required
          />
        </label>

        <label className="block">
          <span className="field-label">Currency</span>
          <select
            className="field-input"
            value={currency}
            onChange={(event) => setCurrency(event.target.value as Currency)}
          >
            {CURRENCIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="field-label">Category</span>
          <select
            className="field-input"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as CategoryName)
            }
          >
            {CATEGORY_NAMES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="field-label">Date</span>
          <input
            className="field-input"
            type="date"
            value={transactionDate}
            onChange={(event) => setTransactionDate(event.target.value)}
            required
          />
        </label>
      </div>

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "Saving..." : "Save changes"}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
