// Owner: apps/web. Formatting helpers for dashboard currency and dates.
import type { BudgetStatusLevel, Currency } from "@trackx/shared";

type TransactionAmount = {
  amount: number;
  currency: Currency;
  amountEur?: number | null;
};

export function formatMoney(amount: number, currency: Currency): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function transactionDisplayAmount(transaction: TransactionAmount): {
  primary: string;
  secondary: string | null;
} {
  if (transaction.currency !== "EUR" && transaction.amountEur != null) {
    return {
      primary: formatMoney(transaction.amountEur, "EUR"),
      secondary: formatMoney(transaction.amount, transaction.currency),
    };
  }

  return {
    primary: formatMoney(transaction.amount, transaction.currency),
    secondary: null,
  };
}

export function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function formatTransactionDescription(description: string): string {
  const trimmed = description.trim();

  if (!trimmed) {
    return description;
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function budgetStatusLabel(status: BudgetStatusLevel): string {
  switch (status) {
    case "ok":
      return "On track";
    case "warning":
      return "Near limit";
    case "over":
      return "Over budget";
  }
}

export function budgetStatusClass(status: BudgetStatusLevel): string {
  switch (status) {
    case "ok":
      return "bg-success-muted text-success";
    case "warning":
      return "bg-warning-muted text-warning";
    case "over":
      return "bg-danger-muted text-danger";
  }
}

export function budgetBarClass(status: BudgetStatusLevel): string {
  switch (status) {
    case "ok":
      return "bg-success";
    case "warning":
      return "bg-warning";
    case "over":
      return "bg-danger";
  }
}
