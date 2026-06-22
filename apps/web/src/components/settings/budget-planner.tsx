// Owner: apps/web. Editable Settings budget planner with AI-assisted split.
"use client";

import { useMemo, useState } from "react";
import {
  CATEGORY_NAMES,
  type BudgetLimitUpsert,
  type BudgetPeriod,
  type CategoryName,
  type Currency,
} from "@trackx/shared";
import type { BudgetRecord } from "@/lib/api";
import { BudgetInputRow, type BudgetRow } from "./budget-input-row";

type BudgetPlannerProps = {
  initialBudgets: BudgetRecord[];
};

type SuggestResponse = {
  period: BudgetPeriod;
  currency: Currency;
  budgets: Array<{
    category: CategoryName;
    limitAmount: number;
    reason: string;
  }>;
  notes: string[];
};

const EXPENSE_CATEGORIES = CATEGORY_NAMES.filter(
  (category) => category !== "Income",
) as CategoryName[];

export function BudgetPlanner({ initialBudgets }: BudgetPlannerProps) {
  const [period, setPeriod] = useState<BudgetPeriod>("month");
  const [currency] = useState<Currency>(initialBudgets[0]?.currency ?? "EUR");
  const [message, setMessage] = useState(
    "Monthly budget 1500 EUR. Keep rent stable and split the rest sensibly.",
  );
  const [rows, setRows] = useState<BudgetRow[]>(() =>
    buildRows(initialBudgets, "month"),
  );
  const [notes, setNotes] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"suggest" | "save" | null>(null);

  const total = useMemo(
    () => rows.reduce((sum, row) => sum + row.limitAmount, 0),
    [rows],
  );

  function changePeriod(nextPeriod: BudgetPeriod) {
    setPeriod(nextPeriod);
    setRows(buildRows(initialBudgets, nextPeriod));
    setNotes([]);
    setStatus(null);
    setError(null);
  }

  function updateAmount(category: CategoryName, nextValue: string) {
    const nextAmount = Math.max(0, Number(nextValue) || 0);
    setRows((current) =>
      current.map((row) =>
        row.category === category
          ? { ...row, limitAmount: nextAmount, reason: null }
          : row,
      ),
    );
  }

  async function suggestBudgets() {
    setBusy("suggest");
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/budgets/suggest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message,
          period,
          currency,
          currentBudgets: rows.map((row) => ({
            category: row.category,
            limitAmount: row.limitAmount,
          })),
        }),
      });

      const body = (await response.json()) as
        | SuggestResponse
        | { error: string };

      if (!response.ok) {
        throw new Error("error" in body ? body.error : "Budget AI failed.");
      }

      const suggestion = body as SuggestResponse;
      const suggestedByCategory = new Map(
        suggestion.budgets.map((budget) => [budget.category, budget]),
      );

      setRows((current) =>
        current.map((row) => {
          const suggested = suggestedByCategory.get(row.category);
          return suggested
            ? {
                ...row,
                limitAmount: suggested.limitAmount,
                reason: suggested.reason,
              }
            : row;
        }),
      );
      setNotes(suggestion.notes);
      setStatus("AI split ready. Edit anything before saving.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Budget AI failed.");
    } finally {
      setBusy(null);
    }
  }

  async function saveBudgets() {
    setBusy("save");
    setError(null);
    setStatus(null);

    const payload: BudgetLimitUpsert = {
      period,
      budgets: rows.map((row) => ({
        category: row.category,
        period,
        limitAmount: row.limitAmount,
        currency,
      })),
    };

    try {
      const response = await fetch("/api/budgets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(body.error ?? "Could not save budgets.");
      }

      setStatus("Budgets saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="panel overflow-hidden">
      <div className="panel-header flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink">Budgets</h2>
          <p className="mt-1 text-xs font-medium text-ink-muted">
            Let AI split the plan, then adjust the numbers.
          </p>
        </div>
        <p className="rounded-full bg-accent-muted px-3 py-1 text-xs font-semibold text-accent-dark">
          {formatAmount(total, currency)}
        </p>
      </div>
      <div className="panel-body space-y-5">
        <div className="flex rounded-full bg-surface-muted p-1">
          {(["month", "week"] as const).map((option) => (
            <button
              key={option}
              className={`min-h-10 flex-1 rounded-full text-sm font-semibold transition duration-200 ease-trackx-out ${
                period === option
                  ? "bg-surface-inverse text-accent shadow-panel"
                  : "text-ink-muted"
              }`}
              type="button"
              onClick={() => changePeriod(option)}
            >
              {option === "month" ? "Monthly" : "Weekly"}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="field-label">Budget goal</span>
          <textarea
            className="field-input min-h-28 resize-none leading-6"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </label>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            className="btn-primary min-h-11"
            type="button"
            disabled={busy !== null}
            onClick={suggestBudgets}
          >
            {busy === "suggest" ? "Splitting..." : "Suggest split"}
          </button>
          <button
            className="btn-secondary min-h-11"
            type="button"
            disabled={busy !== null}
            onClick={saveBudgets}
          >
            {busy === "save" ? "Saving..." : "Save budgets"}
          </button>
        </div>

        {status ? (
          <p className="rounded-2xl bg-success-muted px-4 py-3 text-sm font-semibold text-success">
            {status}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-2xl bg-danger-muted px-4 py-3 text-sm font-semibold text-danger">
            {error}
          </p>
        ) : null}

        <div className="space-y-3">
          {rows.map((row) => (
            <BudgetInputRow
              key={row.category}
              currency={currency}
              row={row}
              onChange={updateAmount}
            />
          ))}
        </div>

        {notes.length > 0 ? (
          <div className="rounded-3xl bg-surface-muted p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Notes
            </p>
            <ul className="mt-2 space-y-1 text-sm text-ink-muted">
              {notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function buildRows(
  initialBudgets: BudgetRecord[],
  period: BudgetPeriod,
): BudgetRow[] {
  const active = new Map(
    initialBudgets
      .filter((budget) => budget.period === period)
      .map((budget) => [budget.category, budget.limitAmount]),
  );

  return EXPENSE_CATEGORIES.map((category) => ({
    category,
    limitAmount: active.get(category) ?? 0,
    reason: null,
  }));
}

function formatAmount(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
