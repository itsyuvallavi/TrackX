// Owner: apps/web. Focused UI pieces for the budget lab prototype.
import type { Currency } from "@trackx/shared";
import { AnimatedMoney } from "@/components/animated-money";
import type { BudgetTotals } from "./budget-lab-demo";

const BUDGET_LAB_CURRENCY: Currency = "EUR";

export function BudgetLimitCard({
  monthlyPot,
  onMonthlyPotChange,
  totals,
}: {
  monthlyPot: number;
  onMonthlyPotChange: (value: number) => void;
  totals: BudgetTotals;
}) {
  const committedPct = Math.min(
    (totals.committed / Math.max(monthlyPot, 1)) * 100,
    100,
  );
  const isOver = totals.unassigned < 0;
  const leftAmount = Math.abs(totals.unassigned);

  return (
    <section className="space-y-2 sm:space-y-3">
      <article className="overflow-hidden rounded-[1.5rem] border border-surface-inverse bg-surface-inverse text-white shadow-panel sm:rounded-[2rem]">
        <div className="flex items-start justify-between gap-3 p-4 sm:gap-4 sm:p-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-accent sm:text-xs">
              Budget limit
            </p>
            <label className="mt-2 flex h-[2rem] max-w-[18rem] items-baseline sm:mt-3 sm:h-[2.75rem]">
              <span className="text-[2rem] font-semibold leading-none text-white/60 sm:text-[2.75rem]">
                €
              </span>
              <input
                aria-label="Monthly budget limit"
                className="h-[2rem] min-w-0 flex-1 appearance-none bg-transparent text-[2rem] font-semibold leading-none tracking-normal tabular-nums text-white outline-none sm:h-[2.75rem] sm:text-[2.75rem]"
                inputMode="decimal"
                min={0}
                type="number"
                value={monthlyPot}
                onChange={(event) =>
                  onMonthlyPotChange(
                    Math.max(0, Number(event.target.value) || 0),
                  )
                }
              />
            </label>
            <p className="mt-2 max-w-[18rem] text-xs leading-5 text-white/70 sm:mt-3 sm:text-sm sm:leading-6">
              <AnimatedMoney
                amount={leftAmount}
                currency={BUDGET_LAB_CURRENCY}
              />{" "}
              {isOver ? "over" : "left from"}{" "}
              <AnimatedMoney
                amount={monthlyPot}
                currency={BUDGET_LAB_CURRENCY}
              />
              .
            </p>
          </div>
          <div
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold tabular-nums sm:px-3 sm:py-1 sm:text-xs ${
              isOver
                ? "bg-danger-muted text-danger"
                : "bg-accent text-accent-dark"
            }`}
          >
            <AnimatedMoney amount={leftAmount} currency={BUDGET_LAB_CURRENCY} />{" "}
            {isOver ? "over" : "left"}
          </div>
        </div>

        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className={`h-full origin-left rounded-full transition-colors duration-700 ease-trackx-out ${
                isOver ? "bg-danger" : "bg-accent"
              }`}
              style={{ transform: `scaleX(${committedPct / 100})` }}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5 sm:mt-4 sm:gap-2">
            <SmallDarkMetric label="Mandatory" value={totals.fixed} />
            <SmallDarkMetric label="Spending" value={totals.flexible} />
          </div>
        </div>
      </article>
    </section>
  );
}

function SmallDarkMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/10 p-2.5 sm:rounded-3xl sm:p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50 sm:text-[0.7rem]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-semibold text-white sm:mt-1 sm:text-sm">
        <AnimatedMoney amount={value} currency={BUDGET_LAB_CURRENCY} />
      </p>
    </div>
  );
}
