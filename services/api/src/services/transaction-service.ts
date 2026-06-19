// Owner: services/api. Transaction CRUD orchestration for API routes.
import { z } from "zod";
import {
  CreateTransactionSchema,
  TransactionSourceSchema,
  TransactionIdSchema,
  UpdateTransactionSchema,
} from "@trackx/shared";
import type {
  TransactionRecord,
  TransactionRepository,
} from "../repositories/transactions.js";
import type { UserRepository } from "../repositories/users.js";

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
  source: TransactionSourceSchema.optional(),
});

export type ApiCreateTransactionInput = z.infer<
  typeof ApiCreateTransactionSchema
>;
export type ApiUpdateTransactionInput = z.infer<
  typeof ApiUpdateTransactionSchema
>;
export type UndoLastInput = z.infer<typeof UndoLastSchema>;

export type TransactionService = {
  create(input: ApiCreateTransactionInput): Promise<TransactionRecord>;
  list(userId?: string): Promise<TransactionRecord[]>;
  remove(id: string, userId?: string): Promise<TransactionRecord>;
  resolveUser(userId?: string): Promise<string>;
  undoLast(input: UndoLastInput): Promise<TransactionRecord>;
  update(
    id: string,
    input: ApiUpdateTransactionInput,
  ): Promise<TransactionRecord>;
};

export function createTransactionService(
  users: UserRepository,
  transactions: TransactionRepository,
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

  return {
    resolveUser,

    async create(input) {
      const userId = await resolveUser(input.userId);
      const transactionDate =
        input.transactionDate ?? new Date().toISOString().slice(0, 10);

      return transactions.create({
        userId,
        type: input.type,
        amount: input.amount,
        currency: input.currency,
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
      const removed = await transactions.undoLast(
        await resolveUser(input.userId),
        input.source,
      );

      if (!removed) {
        throw new ApiNotFoundError("Transaction not found.");
      }

      return removed;
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
