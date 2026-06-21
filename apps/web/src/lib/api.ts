// Owner: apps/web. Server-side API client for the TrackX dashboard.
import type {
  BudgetStatus,
  CategoryName,
  Currency,
  DashboardMonthResponse,
  DashboardWeekResponse,
  TransactionType,
  UpdateTransactionInput,
} from "@trackx/shared";

export type TransactionRecord = {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  category: CategoryName;
  description: string;
  merchant: string | null;
  source: string;
  rawMessage: string | null;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function getApiBaseUrl(): string {
  return process.env.WEB_API_BASE_URL ?? "http://localhost:4001";
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);

  if (init?.body !== undefined && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers,
  });

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;

    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) {
        message = body.error;
      }
    } catch {
      // Keep the default message when the body is not JSON.
    }

    throw new ApiError(message, response.status);
  }

  return (await response.json()) as T;
}

export async function getMonthDashboard(): Promise<DashboardMonthResponse> {
  return apiFetch<DashboardMonthResponse>("/dashboard/month");
}

export async function getWeekDashboard(): Promise<DashboardWeekResponse> {
  return apiFetch<DashboardWeekResponse>("/dashboard/week");
}

export async function getTransactions(): Promise<TransactionRecord[]> {
  return apiFetch<TransactionRecord[]>("/transactions");
}

export async function updateTransaction(
  id: string,
  input: UpdateTransactionInput,
): Promise<TransactionRecord> {
  return apiFetch<TransactionRecord>(`/transactions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export async function deleteTransaction(
  id: string,
): Promise<TransactionRecord> {
  return apiFetch<TransactionRecord>(`/transactions/${id}`, {
    method: "DELETE",
  });
}

export function filterBudgetsByPeriod(
  budgets: BudgetStatus[],
  period: "week" | "month",
): BudgetStatus[] {
  return budgets.filter((budget) => budget.period === period);
}
