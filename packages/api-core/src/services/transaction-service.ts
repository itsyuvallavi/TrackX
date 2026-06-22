// Owner: packages/api-core. Transaction CRUD orchestration for API routes.
import { z } from "zod";
import {
  CategoryNameSchema,
  CreateTransactionSchema,
  TransactionSourceSchema,
  TransactionIdSchema,
  UpdateTransactionSchema,
} from "@trackx/shared";
import type {
  TransactionRecord,
  TransactionRepository,
  TransactionListSort,
} from "../repositories/transactions.js";
import type { UserRepository } from "../repositories/users.js";
import type { ExchangeRateService } from "./exchange-rate-service.js";

export class ApiNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiNotFoundError";
  }
}

export const ApiCreateTransactionSchema = CreateTransactionSchema.omit({
  userId: true,
  source: true,
}).extend({
  userId: z.string().uuid().optional(),
  source: TransactionSourceSchema.default("manual"),
  transactionDate: z.string().date().optional(),
});

export const ApiUpdateTransactionSchema = UpdateTransactionSchema.extend({
  userId: z.string().uuid().optional(),
});

export const TransactionParamsSchema = z.object({
  id: TransactionIdSchema,
});

export const UserQuerySchema = z.object({
  userId: z.string().uuid().optional(),
});

export const UndoLastSchema = z.object({
  userId: z.string().uuid().optional(),
  telegramUserId: z.string().min(1).optional(),
  source: TransactionSourceSchema.optional(),
});

export const UpdateLastCategorySchema = z.object({
  userId: z.string().uuid().optional(),
  telegramUserId: z.string().min(1).optional(),
  source: TransactionSourceSchema.default("telegram"),
  category: CategoryNameSchema,
});

export type ApiCreateTransactionInput = z.infer<
  typeof ApiCreateTransactionSchema
>;
export type ApiUpdateTransactionInput = z.infer<
  typeof ApiUpdateTransactionSchema
>;
export type UndoLastInput = z.infer<typeof UndoLastSchema>;
export type UpdateLastCategoryInput = z.infer<typeof UpdateLastCategorySchema>;

export type TransactionService = {
  create(input: ApiCreateTransactionInput): Promise<TransactionRecord>;
  list(userId?: string): Promise<TransactionRecord[]>;
  listRecent(
    userId: string,
    limit?: number,
    sort?: TransactionListSort,
  ): Promise<TransactionRecord[]>;
  remove(id: string, userId?: string): Promise<TransactionRecord>;
  resolveMessageUser(input: {
    userId?: string | undefined;
    telegramUserId?: string | undefined;
  }): Promise<string>;
  resolveUser(userId?: string): Promise<string>;
  undoLast(input: UndoLastInput): Promise<TransactionRecord>;
  updateLastCategory(
    input: UpdateLastCategoryInput,
  ): Promise<TransactionRecord>;
  update(
    id: string,
    input: ApiUpdateTransactionInput,
  ): Promise<TransactionRecord>;
};

export function createTransactionService(
  users: UserRepository,
  transactions: TransactionRepository,
  exchangeRates?: ExchangeRateService,
): TransactionService {
  async function resolveUser(userId?: string): Promise<string> {
    if (!userId) {
      return (await users.ensureDefaultUser()).id;
    }

    const user = await users.findById(userId);

    if (!user) {
      throw new ApiNotFoundError("User not found.");
    }

    return user.id;
  }

  async function resolveMessageUser(input: {
    userId?: string | undefined;
    telegramUserId?: string | undefined;
  }): Promise<string> {
    if (input.userId) {
      return resolveUser(input.userId);
    }

    if (input.telegramUserId) {
      return (await users.ensureTelegramUser(input.telegramUserId)).id;
    }

    return resolveUser();
  }

  return {
    resolveUser,
    resolveMessageUser,

    async create(input) {
      const userId = await resolveUser(input.userId);
      const transactionDate =
        input.transactionDate ?? new Date().toISOString().slice(0, 10);
      const normalized = await normalizeAmounts({
        exchangeRates,
        amount: input.amount,
        currency: input.currency,
        transactionDate,
      });

      return transactions.create({
        userId,
        type: input.type,
        amount: input.amount,
        currency: input.currency,
        amountEur: normalized.amountEur,
        amountUsd: normalized.amountUsd,
        category: input.category,
        description: input.description,
        merchant: input.merchant ?? null,
        source: input.source,
        rawMessage: input.rawMessage ?? null,
        transactionDate,
      });
    },

    async list(userId) {
      return transactions.listByUser(await resolveUser(userId));
    },

    async listRecent(userId, limit = 10, sort = "logged") {
      return transactions.listRecentByUser(userId, limit, sort);
    },

    async remove(id, userId) {
      const removed = await transactions.softDelete(
        id,
        await resolveUser(userId),
      );

      if (!removed) {
        throw new ApiNotFoundError("Transaction not found.");
      }

      return removed;
    },

    async undoLast(input) {
      const userId = await resolveMessageUser({
        userId: input.userId,
        telegramUserId: input.telegramUserId,
      });
      const removed = await transactions.undoLast(userId, input.source);

      if (!removed) {
        throw new ApiNotFoundError("Transaction not found.");
      }

      return removed;
    },

    async updateLastCategory(input) {
      const userId = await resolveMessageUser({
        userId: input.userId,
        telegramUserId: input.telegramUserId,
      });
      const updated = await transactions.updateLast(userId, input.source, {
        category: input.category,
      });

      if (!updated) {
        throw new ApiNotFoundError("Transaction not found.");
      }

      return updated;
    },

    async update(id, input) {
      const userId = await resolveUser(input.userId);
      const updates = toRepositoryUpdates(input);
      const updated = await transactions.update(id, userId, updates);

      if (!updated) {
        throw new ApiNotFoundError("Transaction not found.");
      }

      return updated;
    },
  };
}

async function normalizeAmounts(input: {
  exchangeRates: ExchangeRateService | undefined;
  amount: number;
  currency: ApiCreateTransactionInput["currency"];
  transactionDate: string;
}) {
  if (!input.exchangeRates) {
    return {
      amountEur: input.currency === "EUR" ? input.amount : null,
      amountUsd: input.currency === "USD" ? input.amount : null,
    };
  }

  return input.exchangeRates.normalize({
    amount: input.amount,
    currency: input.currency,
    date: input.transactionDate,
  });
}

function toRepositoryUpdates(
  input: ApiUpdateTransactionInput,
): Parameters<TransactionRepository["update"]>[2] {
  const updates: Parameters<TransactionRepository["update"]>[2] = {};

  if (input.amount !== undefined) {
    updates.amount = input.amount;
  }

  if (input.currency !== undefined) {
    updates.currency = input.currency;
  }

  if (input.category !== undefined) {
    updates.category = input.category;
  }

  if (input.description !== undefined) {
    updates.description = input.description;
  }

  if (input.merchant !== undefined) {
    updates.merchant = input.merchant;
  }

  if (input.transactionDate !== undefined) {
    updates.transactionDate = input.transactionDate;
  }

  return updates;
}
