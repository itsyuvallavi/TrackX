// Owner: apps/webhook. HTTP client for the TrackX API from Cloudflare Workers.
import { z } from "zod";

const FromMessageResponseSchema = z.object({
  feedback: z.string(),
});

const BudgetStatusResponseSchema = z.object({
  budgets: z.array(
    z.object({
      category: z.string(),
      spentAmount: z.number(),
      limitAmount: z.number(),
      currency: z.string(),
      status: z.string(),
    }),
  ),
});

const MonthDashboardResponseSchema = z.object({
  income: z.number(),
  expenses: z.number(),
  net: z.number(),
  currency: z.string(),
});

export type TrackxApiClient = {
  createFromMessage(input: {
    message: string;
    telegramUserId?: string | undefined;
    timezone: string;
    defaultCurrency: string;
  }): Promise<{ feedback: string }>;
  getBudgetStatus(period: "week" | "month"): Promise<{
    budgets: Array<{
      category: string;
      spentAmount: number;
      limitAmount: number;
      currency: string;
      status: string;
    }>;
  }>;
  getMonthDashboard(): Promise<{
    income: number;
    expenses: number;
    net: number;
    currency: string;
  }>;
  undoLast(): Promise<{
    description: string;
    amount: number;
    currency: string;
  }>;
  updateLastCategory(input: {
    category: string;
    telegramUserId?: string | undefined;
  }): Promise<{
    description: string;
    amount: number;
    currency: string;
    category: string;
  }>;
};

export function createTrackxApiClient(baseUrl: string): TrackxApiClient {
  return {
    async createFromMessage(input) {
      return FromMessageResponseSchema.parse(
        await requestJson(`${baseUrl}/transactions/from-message`, {
          method: "POST",
          body: JSON.stringify(input),
        }),
      );
    },
    async getBudgetStatus(period) {
      return BudgetStatusResponseSchema.parse(
        await requestJson(`${baseUrl}/budgets/status?period=${period}`),
      );
    },
    async getMonthDashboard() {
      return MonthDashboardResponseSchema.parse(
        await requestJson(`${baseUrl}/dashboard/month`),
      );
    },
    async undoLast() {
      return z
        .object({
          description: z.string(),
          amount: z.number(),
          currency: z.string(),
        })
        .parse(
          await requestJson(`${baseUrl}/transactions/undo-last`, {
            method: "POST",
            body: JSON.stringify({ source: "telegram" }),
          }),
        );
    },
    async updateLastCategory(input) {
      return z
        .object({
          description: z.string(),
          amount: z.number(),
          currency: z.string(),
          category: z.string(),
        })
        .parse(
          await requestJson(`${baseUrl}/transactions/update-last-category`, {
            method: "POST",
            body: JSON.stringify({
              source: "telegram",
              category: input.category,
              telegramUserId: input.telegramUserId,
            }),
          }),
        );
    },
  };
}

async function requestJson(
  url: string,
  init: RequestInit = {},
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`TrackX API returned ${response.status}.`);
  }

  return response.json();
}
