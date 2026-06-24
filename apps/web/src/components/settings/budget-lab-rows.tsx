// Owner: apps/web. Editable budget rows for the budget lab prototype.
"use client";

import { useEffect, useRef, useState } from "react";
import type { Currency } from "@trackx/shared";
import { AnimatedMoney } from "@/components/animated-money";
import { percentOf, roundToFive, type MoneyRow } from "./budget-lab-utils";

const BUDGET_LAB_CURRENCY: Currency = "EUR";

export function MandatoryBudgetRow({
  limit,
  onAmountChange,
  onRemove,
  onRename,
  row,
}: {
  limit: number;
  onAmountChange: (id: string, amount: number) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
  row: MoneyRow;
}) {
  const percent = percentOf(row.amount, limit);

  return (
    <article className="py-2.5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-baseline gap-1">
          <EditableMandatoryName
            label={row.label}
            onChange={(label) => onRename(row.id, label)}
          />
          <p className="shrink-0 text-[10px] font-medium tabular-nums text-ink-muted sm:text-xs">
            {Math.round(percent)}%
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <EditableMandatoryAmount
            amount={row.amount}
            label={row.label}
            onChange={(amount) => onAmountChange(row.id, amount)}
          />
          <button
            aria-label={`Remove ${row.label}`}
            className="grid size-8 place-items-center rounded-full text-sm font-semibold text-ink-muted transition-colors duration-150 ease-trackx-out hover:bg-danger-muted hover:text-danger focus-visible:ring-2 focus-visible:ring-accent"
            type="button"
            onClick={() => onRemove(row.id)}
          >
            x
          </button>
        </div>
      </div>
      <ProgressRail value={percent} />
    </article>
  );
}

function EditableMandatoryName({
  label,
  onChange,
}: {
  label: string;
  onChange: (label: string) => void;
}) {
  const [draft, setDraft] = useState(label);
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(label);
    }
  }, [isEditing, label]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function commitDraft() {
    const nextLabel = draft.trim() || label;

    onChange(nextLabel);
    setDraft(nextLabel);
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        aria-label="Mandatory expense name"
        className="w-32 max-w-[11rem] bg-transparent text-xs font-semibold text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent sm:max-w-[16rem] sm:text-sm"
        value={draft}
        onBlur={commitDraft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            commitDraft();
          }

          if (event.key === "Escape") {
            setDraft(label);
            setIsEditing(false);
          }
        }}
      />
    );
  }

  return (
    <button
      aria-label={`Edit ${label} name`}
      className="max-w-[11rem] truncate text-xs font-semibold text-ink outline-none hover:text-success focus-visible:ring-2 focus-visible:ring-accent sm:max-w-[16rem] sm:text-sm"
      type="button"
      onClick={() => setIsEditing(true)}
    >
      {label}
    </button>
  );
}

function EditableMandatoryAmount({
  amount,
  label,
  onChange,
}: {
  amount: number;
  label: string;
  onChange: (amount: number) => void;
}) {
  const [draft, setDraft] = useState(toDraftAmount(amount));
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) {
      setDraft(toDraftAmount(amount));
    }
  }, [amount, isEditing]);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  function commitDraft() {
    const parsed = Number.parseFloat(draft.replace(",", "."));
    const nextAmount = Number.isFinite(parsed)
      ? Math.max(Math.round(parsed * 100) / 100, 0)
      : 0;

    onChange(nextAmount);
    setDraft(toDraftAmount(nextAmount));
    setIsEditing(false);
  }

  if (isEditing) {
    return (
      <label className="inline-flex items-baseline gap-1 rounded-md text-xs font-semibold tabular-nums text-ink focus-within:ring-2 focus-within:ring-accent sm:text-sm">
        <span className="text-ink-muted">€</span>
        <input
          ref={inputRef}
          aria-label={`${label} amount`}
          className="w-20 bg-transparent font-semibold outline-none"
          inputMode="decimal"
          min={0}
          type="number"
          value={draft}
          onBlur={commitDraft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              commitDraft();
            }

            if (event.key === "Escape") {
              setDraft(toDraftAmount(amount));
              setIsEditing(false);
            }
          }}
        />
      </label>
    );
  }

  return (
    <button
      aria-label={`Edit ${label} amount`}
      className="rounded-md text-xs font-semibold tabular-nums text-ink transition-colors duration-150 ease-trackx-out hover:text-success focus-visible:ring-2 focus-visible:ring-accent sm:text-sm"
      type="button"
      onClick={() => setIsEditing(true)}
    >
      <AnimatedMoney
        amount={amount}
        animation="mount"
        currency={BUDGET_LAB_CURRENCY}
      />
    </button>
  );
}

function toDraftAmount(amount: number): string {
  return String(amount);
}

export function SpendingBudgetRow({
  isLimited,
  isSettling,
  max,
  onChange,
  onRemove,
  onSettle,
  pool,
  row,
}: {
  isLimited: boolean;
  isSettling: boolean;
  max: number;
  onChange: (amount: number) => void;
  onRemove: (id: string) => void;
  onSettle: () => void;
  pool: number;
  row: MoneyRow;
}) {
  const percent = percentOf(row.amount, pool);

  return (
    <article className="py-2.5">
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="flex min-w-0 items-baseline gap-1.5">
          <p className="truncate text-xs font-semibold text-ink sm:text-sm">
            {row.label}
          </p>
          <p className="shrink-0 text-[10px] font-medium tabular-nums text-ink-muted sm:text-xs">
            {Math.round(percent)}%
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <p
            className={`text-xs font-semibold tabular-nums transition-colors duration-500 ease-trackx-out sm:text-sm ${
              isLimited || isSettling ? "text-danger" : "text-ink"
            }`}
          >
            <AnimatedMoney
              amount={row.amount}
              animation="mount"
              currency={BUDGET_LAB_CURRENCY}
            />
          </p>
          <button
            aria-label={`Remove ${row.label}`}
            className="grid size-8 place-items-center rounded-full text-sm font-semibold text-ink-muted transition-colors duration-150 ease-trackx-out hover:bg-danger-muted hover:text-danger focus-visible:ring-2 focus-visible:ring-accent"
            type="button"
            onClick={() => onRemove(row.id)}
          >
            x
          </button>
        </div>
      </div>
      <SliderTrack
        amount={row.amount}
        isLimited={isLimited}
        isSettling={isSettling}
        label={row.label}
        max={max}
        onChange={onChange}
        onSettle={onSettle}
      />
    </article>
  );
}

function ProgressRail({ value }: { value: number }) {
  return (
    <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-rail sm:mt-2 sm:h-1.5">
      <div
        className="h-full rounded-full bg-surface-inverse"
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  );
}

function SliderTrack({
  amount,
  isLimited,
  isSettling,
  label,
  max,
  onChange,
  onSettle,
}: {
  amount: number;
  isLimited: boolean;
  isSettling: boolean;
  label: string;
  max: number;
  onChange: (amount: number) => void;
  onSettle: () => void;
}) {
  const percent = percentOf(amount, max);
  const isDanger = isLimited || isSettling;

  return (
    <div className="group relative mt-1 h-1 sm:mt-2 sm:h-1.5">
      <input
        aria-label={`${label} budget`}
        className="peer absolute inset-x-0 -inset-y-3 z-10 w-full cursor-pointer opacity-0"
        max={Math.max(max, 1)}
        min={0}
        step={5}
        type="range"
        value={amount}
        onBlur={onSettle}
        onChange={(event) => onChange(roundToFive(Number(event.target.value)))}
        onKeyUp={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            onSettle();
          }
        }}
        onPointerCancel={onSettle}
        onPointerUp={onSettle}
      />
      <div className="absolute inset-0 rounded-full bg-surface-rail peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-4" />
      <div
        className={`absolute inset-y-0 left-0 rounded-full transition-[width,background-color] duration-700 ease-trackx-out ${
          isDanger ? "bg-danger" : "bg-surface-inverse"
        }`}
        style={{ width: `${percent}%` }}
      />
      <div
        className={`pointer-events-none absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-surface opacity-0 shadow-panel transition-[left,background-color,opacity] duration-200 ease-trackx-out group-hover:opacity-100 peer-active:opacity-100 peer-focus-visible:opacity-100 ${
          isDanger ? "bg-danger" : "bg-accent"
        }`}
        style={{
          left: `${percent}%`,
        }}
      />
    </div>
  );
}
