// Owner: apps/web. Direct service reads for server components (no HTTP self-fetch).
import type {
  DashboardMonthResponse,
  DashboardWeekResponse,
} from "@trackx/shared";
import type { TransactionRecord } from "@trackx/api-core";
import { ApiError, type BudgetRecord } from "@/lib/api";
import {
  getBudgetService,
  getShortcutImportService,
  getTransactionService,
  getUserRepository,
} from "@/lib/api-route-runtime";

export async function loadDashboardData(userId: string): Promise<{
  monthDashboard: DashboardMonthResponse;
  weekDashboard: DashboardWeekResponse;
  transactions: TransactionRecord[];
}> {
  return withPageDataError(async () => {
    const budgetService = getBudgetService();
    const transactionService = getTransactionService();

    const [monthDashboard, weekDashboard, transactions] = await Promise.all([
      budgetService.getMonthDashboard(userId),
      budgetService.getWeekDashboard(userId),
      transactionService.listRecent(userId, 5, "transactionDate"),
    ]);

    return { monthDashboard, weekDashboard, transactions };
  });
}

export async function loadTransactions(
  userId: string,
): Promise<TransactionRecord[]> {
  return withPageDataError(() => getTransactionService().list(userId));
}

export async function loadBudgets(userId: string): Promise<BudgetRecord[]> {
  return withPageDataError(() =>
    getBudgetService()
      .list({ userId })
      .then((budgets) =>
        budgets.map((budget) => ({
          id: budget.id,
          category: budget.category,
          period: budget.period,
          limitAmount: budget.limitAmount,
          currency: budget.currency,
        })),
      ),
  );
}

export async function loadTelegramConnection(userId: string): Promise<{
  connected: boolean;
  telegramUserId: string | null;
}> {
  return withPageDataError(async () => {
    const connection = await getUserRepository().getTelegramConnection(userId);
    const telegramUserId = connection?.telegramUserId ?? null;

    return {
      connected: telegramUserId !== null,
      telegramUserId,
    };
  });
}

export async function loadShortcutImportToken(userId: string): Promise<{
  connected: boolean;
  tokenPreview: string | null;
  lastUsedAt: string | null;
  createdAt: string | null;
}> {
  return withPageDataError(async () => {
    const token = await getShortcutImportService().getActiveToken(userId);

    return {
      connected: Boolean(token),
      tokenPreview: token?.tokenPreview ?? null,
      lastUsedAt: token?.lastUsedAt ?? null,
      createdAt: token?.createdAt ?? null,
    };
  });
}

async function withPageDataError<T>(load: () => Promise<T>): Promise<T> {
  try {
    return await load();
  } catch (error) {
    throw toPageDataError(error);
  }
}

function toPageDataError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (isPrismaClientError(error)) {
    console.error("Database error while loading page data:", error);
    return new ApiError("Database unavailable.", 503);
  }

  console.error("Unexpected error while loading page data:", error);

  return new ApiError("Could not load page data.", 500);
}

function isPrismaClientError(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("name" in error)) {
    return false;
  }

  const name = error.name;

  return typeof name === "string" && name.startsWith("PrismaClient");
}
