// Owner: apps/web. Budget lab panel shell and tab state.
"use client";

import { useRef, useState } from "react";
import type { BudgetTotals } from "./budget-lab-demo";
import { MandatoryBudgetRow, SpendingBudgetRow } from "./budget-lab-rows";
import { formatMoney, sumRows, type MoneyRow } from "./budget-lab-utils";

type BudgetPane = "mandatory" | "spending";
type BudgetLabSaveState = "idle" | "saving" | "saved" | "error";

export function BudgetEditorPanel({
  fixedRows,
  flexRows,
  hasUnsavedChanges,
  onAddActivePane,
  onAiSplit,
  onFixedAmountChange,
  onFixedRemove,
  onFixedRename,
  onFlexAmountChange,
  onFlexRemove,
  onSave,
  saveMessage,
  saveState,
  totals,
}: {
  fixedRows: MoneyRow[];
  flexRows: MoneyRow[];
  hasUnsavedChanges: boolean;
  onAddActivePane: (pane: BudgetPane) => void;
  onAiSplit: () => void;
  onFixedAmountChange: (id: string, amount: number) => void;
  onFixedRemove: (id: string) => void;
  onFixedRename: (id: string, label: string) => void;
  onFlexAmountChange: (id: string, amount: number) => void;
  onFlexRemove: (id: string) => void;
  onSave: () => void;
  saveMessage: string | null;
  saveState: BudgetLabSaveState;
  totals: BudgetTotals;
}) {
  const [pane, setPane] = useState<BudgetPane>("mandatory");
  const [overLimitId, setOverLimitId] = useState<string | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const settlingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pool = Math.max(totals.monthlyPot - totals.fixed, 0);

  function allowedForRow(row: MoneyRow): number {
    return Math.max(pool - (totals.flexible - row.amount), 0);
  }

  function changeFlexible(row: MoneyRow, amount: number) {
    const allowed = allowedForRow(row);
    setOverLimitId(amount > allowed ? row.id : null);
    onFlexAmountChange(row.id, amount);
  }

  function settleFlexible(row: MoneyRow) {
    const allowed = allowedForRow(row);

    if (row.amount > allowed) {
      onFlexAmountChange(row.id, allowed);
      setOverLimitId(null);
      setSettlingId(row.id);

      if (settlingTimer.current) {
        clearTimeout(settlingTimer.current);
      }

      settlingTimer.current = setTimeout(() => {
        setSettlingId((current) => (current === row.id ? null : current));
      }, 700);
    } else {
      setOverLimitId(null);
    }
  }

  function removeFlexible(id: string) {
    setOverLimitId((current) => (current === id ? null : current));
    setSettlingId((current) => (current === id ? null : current));
    onFlexRemove(id);
  }

  return (
    <section className="panel flex flex-col overflow-hidden bg-surface">
      <div className="panel-header flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-5 sm:py-4">
        <div className="flex items-center gap-2">
          <div>
            <h2 className="text-xs font-semibold text-ink sm:text-sm">
              Budgets
            </h2>
            <p className="mt-0.5 text-xs font-medium text-ink-muted">
              {pane === "mandatory"
                ? formatMoney(sumRows(fixedRows))
                : formatMoney(totals.flexible)}
            </p>
          </div>
          <button
            className="h-8 rounded-full border border-surface-border bg-surface px-3 text-xs font-semibold text-accent-dark transition duration-150 ease-trackx-out hover:bg-accent-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            type="button"
            onClick={onAiSplit}
          >
            AI Suggest
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
          <PaneToggle pane={pane} onChange={setPane} />
          <button
            aria-label={`Add ${pane === "mandatory" ? "mandatory expense" : "spending category"}`}
            className="grid size-8 place-items-center rounded-full border border-surface-border bg-surface text-base font-semibold leading-none text-ink transition duration-150 ease-trackx-out hover:bg-accent-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            type="button"
            onClick={() => onAddActivePane(pane)}
          >
            +
          </button>
          <button
            className={`h-8 rounded-full px-3 text-xs font-semibold transition duration-150 ease-trackx-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
              hasUnsavedChanges
                ? "bg-surface-inverse text-accent shadow-panel hover:bg-accent hover:text-accent-dark"
                : "cursor-not-allowed bg-surface-muted text-ink-soft"
            }`}
            type="button"
            disabled={!hasUnsavedChanges || saveState === "saving"}
            onClick={onSave}
          >
            {saveState === "saving" ? "Saving" : "Save"}
          </button>
        </div>
      </div>
      {saveMessage ? (
        <p
          className={`border-t border-surface-border px-3 py-2 text-xs font-semibold sm:px-5 ${
            saveState === "error" ? "text-danger" : "text-success"
          }`}
        >
          {saveMessage}
        </p>
      ) : null}

      <div className="divide-y divide-surface-border px-3 py-2.5 sm:px-4 sm:py-3">
        {pane === "mandatory"
          ? fixedRows.map((row) => (
              <MandatoryBudgetRow
                key={row.id}
                limit={totals.monthlyPot}
                row={row}
                onAmountChange={onFixedAmountChange}
                onRemove={onFixedRemove}
                onRename={onFixedRename}
              />
            ))
          : flexRows.map((row) => (
              <SpendingBudgetRow
                key={row.id}
                isLimited={overLimitId === row.id}
                isSettling={settlingId === row.id}
                max={Math.max(pool, row.amount)}
                pool={pool}
                row={row}
                onChange={(amount) => changeFlexible(row, amount)}
                onRemove={removeFlexible}
                onSettle={() => settleFlexible(row)}
              />
            ))}
      </div>
    </section>
  );
}

function PaneToggle({
  onChange,
  pane,
}: {
  onChange: (pane: BudgetPane) => void;
  pane: BudgetPane;
}) {
  return (
    <div className="flex h-8 rounded-full border border-surface-border bg-surface-muted p-0.5">
      {(["mandatory", "spending"] as const).map((value) => (
        <button
          key={value}
          className={`rounded-full px-3 text-xs font-semibold transition-colors duration-150 ease-trackx-out ${
            pane === value
              ? "bg-surface-inverse text-white"
              : "text-ink-muted hover:text-ink"
          }`}
          type="button"
          onClick={() => onChange(value)}
        >
          {value === "mandatory" ? "Mandatory" : "Spending"}
        </button>
      ))}
    </div>
  );
}
