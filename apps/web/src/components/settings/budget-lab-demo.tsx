// Owner: apps/web. Editable budget lab for monthly category planning.
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { BudgetLimitUpsert } from "@trackx/shared";
import type { BudgetRecord } from "@/lib/api";
import { BudgetEditorPanel } from "./budget-lab-controls";
import { BudgetLimitCard } from "./budget-lab-parts";
import {
  buildInitialRows,
  getNextFlexRow,
  roundToFive,
  signatureForRows,
  sumRows,
  toMonthlyBudgetPayloadRows,
  toWeeklyBudgetPayloadRows,
  updateRows,
  type MoneyRow,
} from "./budget-lab-utils";

export type BudgetTotals = {
  committed: number;
  fixed: number;
  flexible: number;
  monthlyPot: number;
  unassigned: number;
};

type BudgetLabSaveState = "idle" | "saving" | "saved" | "error";

export function BudgetLabDemo({
  initialBudgets,
}: {
  initialBudgets: BudgetRecord[];
}) {
  const router = useRouter();
  const initialState = useMemo(
    () => buildInitialRows(initialBudgets),
    [initialBudgets],
  );
  const [monthlyPot, setMonthlyPot] = useState(initialState.monthlyPot);
  const [fixedRows, setFixedRows] = useState<MoneyRow[]>(
    initialState.fixedRows,
  );
  const [flexRows, setFlexRows] = useState<MoneyRow[]>(initialState.flexRows);
  const [savedSignature, setSavedSignature] = useState(initialState.signature);
  const [saveState, setSaveState] = useState<BudgetLabSaveState>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const totals = useMemo<BudgetTotals>(() => {
    const fixed = sumRows(fixedRows);
    const flexible = sumRows(flexRows);
    const committed = fixed + flexible;
    const unassigned = monthlyPot - committed;

    return {
      committed,
      fixed,
      flexible,
      monthlyPot,
      unassigned,
    };
  }, [fixedRows, flexRows, monthlyPot]);

  function updateFlex(id: string, amount: number) {
    markDirty();
    setFlexRows((rows) => updateRows(rows, id, amount));
  }

  function updateFixed(id: string, amount: number) {
    markDirty();
    setFixedRows((rows) => updateRows(rows, id, amount));
  }

  function addFixedCharge() {
    markDirty();
    const index = fixedRows.length + 1;
    setFixedRows((rows) => [
      ...rows,
      { id: crypto.randomUUID(), label: `Payment ${index}`, amount: 0 },
    ]);
  }

  function addFlexCategory() {
    markDirty();
    setFlexRows((rows) => [...rows, getNextFlexRow(rows)]);
  }

  function renameFixed(id: string, label: string) {
    markDirty();
    setFixedRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, label } : row)),
    );
  }

  function removeFixed(id: string) {
    markDirty();
    setFixedRows((rows) => rows.filter((row) => row.id !== id));
  }

  function removeFlex(id: string) {
    markDirty();
    setFlexRows((rows) => rows.filter((row) => row.id !== id));
  }

  function applySuggestedSplit() {
    markDirty();
    const available = Math.max(monthlyPot - sumRows(fixedRows), 0);
    const weights = [0.34, 0.28, 0.12, 0.11];
    let assigned = 0;

    setFlexRows((rows) =>
      rows.map((row, index) => {
        if (index === rows.length - 1) {
          return { ...row, amount: Math.max(available - assigned, 0) };
        }

        const remaining = Math.max(available - assigned, 0);
        const amount = Math.min(
          roundToFive(available * (weights[index] ?? 0.1)),
          remaining,
        );
        assigned += amount;

        return { ...row, amount };
      }),
    );
  }

  function changeMonthlyPot(amount: number) {
    setMonthlyPot(amount);
  }

  async function saveBudgets() {
    setSaveState("saving");
    setSaveMessage(null);

    const monthlyPayload: BudgetLimitUpsert = {
      period: "month",
      budgets: toMonthlyBudgetPayloadRows(fixedRows, flexRows),
    };
    const weeklyPayload: BudgetLimitUpsert = {
      period: "week",
      budgets: toWeeklyBudgetPayloadRows(flexRows),
    };

    try {
      await saveBudgetPeriod(monthlyPayload);
      await saveBudgetPeriod(weeklyPayload);

      setSavedSignature(signatureForRows(fixedRows, flexRows));
      setSaveState("saved");
      setSaveMessage("Saved.");
      router.refresh();
    } catch (caught) {
      setSaveState("error");
      setSaveMessage(
        caught instanceof Error ? caught.message : "Could not save budgets.",
      );
    }
  }

  function markDirty() {
    if (saveState !== "saving") {
      setSaveState("idle");
      setSaveMessage(null);
    }
  }

  const currentSignature = signatureForRows(fixedRows, flexRows);
  const hasUnsavedChanges = currentSignature !== savedSignature;

  return (
    <section className="space-y-3 lg:space-y-4">
      <BudgetLimitCard
        monthlyPot={monthlyPot}
        totals={totals}
        onMonthlyPotChange={changeMonthlyPot}
      />

      <BudgetEditorPanel
        fixedRows={fixedRows}
        flexRows={flexRows}
        hasUnsavedChanges={hasUnsavedChanges}
        saveMessage={saveMessage}
        saveState={saveState}
        totals={totals}
        onAiSplit={applySuggestedSplit}
        onAddActivePane={(pane) =>
          pane === "mandatory" ? addFixedCharge() : addFlexCategory()
        }
        onFixedAmountChange={updateFixed}
        onFixedRemove={removeFixed}
        onFixedRename={renameFixed}
        onFlexAmountChange={updateFlex}
        onFlexRemove={removeFlex}
        onSave={saveBudgets}
      />
    </section>
  );
}

async function saveBudgetPeriod(payload: BudgetLimitUpsert) {
  const response = await fetch("/api/budgets", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(body.error ?? "Could not save budgets.");
  }
}
