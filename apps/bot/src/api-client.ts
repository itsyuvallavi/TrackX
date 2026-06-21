// Owner: apps/bot. HTTP client for the TrackX API service.
import { z } from "zod";

export const BotTransactionSchema = z.object({
  id: z.string(),
  amount: z.number(),
  currency: z.string(),
  category: z.string(),
  description: z.string(),
});

export const FromMessageResponseSchema = z.object({
  transactions: z.array(BotTransactionSchema),
  needsClarification: z.boolean(),
  clarifyingQuestion: z.string().nullable(),
  feedback: z.string(),
  parser: z.string().nullable(),
});

export const BudgetStatusResponseSchema = z.object({
  budgets: z.array(
    z.object({
      category: z.string(),
      period: z.string(),
      currency: z.string(),
      limitAmount: z.number(),
      spentAmount: z.number(),
      remainingAmount: z.number(),
      percentageUsed: z.number(),
      status: z.string(),
    }),
  ),
});

export const MonthDashboardResponseSchema = z.object({
  income: z.number(),
  expenses: z.number(),
  net: z.number(),
  currency: z.string(),
});

export type FromMessageResponse = z.infer<typeof FromMessageResponseSchema>;
export type BudgetStatusResponse = z.infer<typeof BudgetStatusResponseSchema>;
export type MonthDashboardResponse = z.infer<
  typeof MonthDashboardResponseSchema
>;

export type TrackxApiClient = {
  createFromMessage(input: {
    message: string;
    telegramUserId?: string | undefined;
    timezone: string;
    defaultCurrency?: string;
  }): Promise<FromMessageResponse>;
  getBudgetStatus(period: "week" | "month"): Promise<BudgetStatusResponse>;
  getMonthDashboard(): Promise<MonthDashboardResponse>;
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
      const response = await requestJson(`${baseUrl}/transactions/undo-last`, {
        method: "POST",
        body: JSON.stringify({ source: "telegram" }),
      });

      return z
        .object({
          description: z.string(),
          amount: z.number(),
          currency: z.string(),
        })
        .parse(response);
    },
    async updateLastCategory(input) {
      const response = await requestJson(
        `${baseUrl}/transactions/update-last-category`,
        {
          method: "POST",
          body: JSON.stringify({
            source: "telegram",
            category: input.category,
            telegramUserId: input.telegramUserId,
          }),
        },
      );

      return BotTransactionSchema.parse(response);
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
