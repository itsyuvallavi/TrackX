// Owner: apps/web. Compact status, category, and source chips for console UI.
import type { BudgetStatusLevel, CategoryName } from "@trackx/shared";
import { budgetStatusLabel } from "@/lib/format";

type CategoryChipProps = {
  category: CategoryName;
};

type SourceChipProps = {
  source: string;
};

type StatusChipProps = {
  status: BudgetStatusLevel;
};

export function CategoryChip({ category }: CategoryChipProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-surface-border bg-surface px-2.5 py-1 text-xs font-semibold text-ink shadow-sm">
      <span className={`h-3 w-0.5 rounded-full ${categoryAccent(category)}`} />
      {category}
    </span>
  );
}

export function SourceChip({ source }: SourceChipProps) {
  return (
    <span className="inline-flex rounded-full bg-accent-muted px-2.5 py-1 text-xs font-semibold capitalize text-accent-dark">
      {source}
    </span>
  );
}

export function StatusChip({ status }: StatusChipProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(status)}`}
    >
      {budgetStatusLabel(status)}
    </span>
  );
}

function statusClass(status: BudgetStatusLevel): string {
  switch (status) {
    case "ok":
      return "bg-success-muted text-success";
    case "warning":
      return "bg-warning-muted text-warning";
    case "over":
      return "bg-danger-muted text-danger";
  }
}

function categoryAccent(category: CategoryName): string {
  switch (category) {
    case "Income":
      return "bg-success";
    case "Transport":
      return "bg-accent";
    case "Restaurants / Cafes / Fun":
      return "bg-warning";
    case "Groceries":
      return "bg-success";
    case "Home":
    case "Rent":
      return "bg-danger";
    case "Utilities":
    case "Subscriptions / Tools":
      return "bg-accent-dark";
    case "Travel":
    case "Shopping":
    case "Misc":
      return "bg-ink-muted";
  }
}
