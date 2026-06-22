// Owner: apps/webhook. HTTP client for the TrackX API from Cloudflare Workers.
import { BudgetStatusResponseSchema } from "@trackx/shared";
import { z } from "zod";

const FromMessageResponseSchema = z.object({
  feedback: z.string(),
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
  getBudgetStatus(input: {
    period: "week" | "month";
    telegramUserId?: string | undefined;
  }): Promise<z.infer<typeof BudgetStatusResponseSchema>>;
  getMonthDashboard(input: { telegramUserId?: string | undefined }): Promise<{
    income: number;
    expenses: number;
    net: number;
    currency: string;
  }>;
  undoLast(input: { telegramUserId?: string | undefined }): Promise<{
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

export function createTrackxApiClient(
  baseUrl: string,
  apiSecret: string,
): TrackxApiClient {
  const authHeaders = { "x-trackx-api-secret": apiSecret };

  return {
    async createFromMessage(input) {
      return FromMessageResponseSchema.parse(
        await requestJson(`${baseUrl}/transactions/from-message`, {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify(input),
        }),
      );
    },
    async getBudgetStatus(input) {
      const params = new URLSearchParams({ period: input.period });
      if (input.telegramUserId) {
        params.set("telegramUserId", input.telegramUserId);
      }

      return BudgetStatusResponseSchema.parse(
        await requestJson(`${baseUrl}/budgets/status?${params}`, {
          headers: authHeaders,
        }),
      );
    },
    async getMonthDashboard(input) {
      const params = new URLSearchParams();
      if (input.telegramUserId) {
        params.set("telegramUserId", input.telegramUserId);
      }

      return MonthDashboardResponseSchema.parse(
        await requestJson(`${baseUrl}/dashboard/month?${params}`, {
          headers: authHeaders,
        }),
      );
    },
    async undoLast(input) {
      return z
        .object({
          description: z.string(),
          amount: z.number(),
          currency: z.string(),
        })
        .parse(
          await requestJson(`${baseUrl}/transactions/undo-last`, {
            method: "POST",
            headers: authHeaders,
            body: JSON.stringify({
              source: "telegram",
              telegramUserId: input.telegramUserId,
            }),
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
            headers: authHeaders,
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
