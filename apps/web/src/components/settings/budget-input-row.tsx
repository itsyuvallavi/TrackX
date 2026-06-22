// Owner: apps/web. Single editable budget category row for Settings.
import type { CategoryName, Currency } from "@trackx/shared";

export type BudgetRow = {
  category: CategoryName;
  limitAmount: number;
  reason: string | null;
};

type BudgetInputRowProps = {
  currency: Currency;
  row: BudgetRow;
  onChange: (category: CategoryName, nextValue: string) => void;
};

export function BudgetInputRow({
  currency,
  row,
  onChange,
}: BudgetInputRowProps) {
  return (
    <div className="rounded-3xl border border-surface-border bg-surface-muted p-3">
      <label className="grid gap-3 sm:grid-cols-[1fr_160px] sm:items-center">
        <span>
          <span className="block text-sm font-semibold text-ink">
            {row.category}
          </span>
          <span className="mt-1 block text-xs leading-5 text-ink-muted">
            {row.reason ?? "Set 0 to turn this budget off."}
          </span>
        </span>
        <span className="flex items-center gap-2 rounded-2xl bg-surface px-3 py-2">
          <span className="text-xs font-semibold text-ink-muted">
            {currency}
          </span>
          <input
            className="w-full bg-transparent text-right text-sm font-semibold tabular-nums text-ink outline-none"
            inputMode="decimal"
            min="0"
            step="0.01"
            type="number"
            value={row.limitAmount}
            onChange={(event) => onChange(row.category, event.target.value)}
          />
        </span>
      </label>
    </div>
  );
}
