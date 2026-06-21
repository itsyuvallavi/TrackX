// Owner: services/api. Transaction repository boundary and Prisma implementation.
import type {
  CategoryName,
  Currency,
  TransactionSource,
  TransactionType,
} from "@trackx/shared";
import { CategoryNameSchema } from "@trackx/shared";
import type { PrismaClient } from "@trackx/db";

export class CategoryNotFoundError extends Error {
  constructor(category: CategoryName) {
    super(`Category not found: ${category}`);
    this.name = "CategoryNotFoundError";
  }
}

export type TransactionRecord = {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  category: CategoryName;
  description: string;
  merchant: string | null;
  source: TransactionSource;
  rawMessage: string | null;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CreateTransactionRecordInput = {
  userId: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  category: CategoryName;
  description: string;
  merchant: string | null;
  source: TransactionSource;
  rawMessage: string | null;
  transactionDate: string;
};

export type UpdateTransactionRecordInput = Partial<
  Pick<
    CreateTransactionRecordInput,
    | "amount"
    | "currency"
    | "category"
    | "description"
    | "merchant"
    | "transactionDate"
  >
>;

export type TransactionRepository = {
  create(input: CreateTransactionRecordInput): Promise<TransactionRecord>;
  listByUser(userId: string): Promise<TransactionRecord[]>;
  listRecentByUser(userId: string, limit: number): Promise<TransactionRecord[]>;
  softDelete(id: string, userId: string): Promise<TransactionRecord | null>;
  undoLast(
    userId: string,
    source?: TransactionSource,
  ): Promise<TransactionRecord | null>;
  update(
    id: string,
    userId: string,
    input: UpdateTransactionRecordInput,
  ): Promise<TransactionRecord | null>;
  updateLast(
    userId: string,
    source: TransactionSource,
    input: UpdateTransactionRecordInput,
  ): Promise<TransactionRecord | null>;
};

export function createPrismaTransactionRepository(
  prisma: PrismaClient,
): TransactionRepository {
  return {
    async create(input) {
      const category = await findCategoryOrThrow(prisma, input.category);
      const transaction = await prisma.transaction.create({
        data: {
          userId: input.userId,
          type: input.type,
          amount: input.amount,
          currency: input.currency,
          categoryId: category.id,
          description: input.description,
          merchant: input.merchant,
          source: input.source,
          rawMessage: input.rawMessage,
          transactionDate: dateFromDay(input.transactionDate),
        },
        include: { category: true },
      });

      return mapTransaction(transaction);
    },

    async listByUser(userId) {
      const transactions = await prisma.transaction.findMany({
        where: { userId, deletedAt: null },
        orderBy: { transactionDate: "desc" },
        include: { category: true },
      });

      return transactions.map(mapTransaction);
    },

    async listRecentByUser(userId, limit) {
      const transactions = await prisma.transaction.findMany({
        where: { userId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: limit,
        include: { category: true },
      });

      return transactions.map(mapTransaction);
    },

    async softDelete(id, userId) {
      const existing = await prisma.transaction.findFirst({
        where: { id, userId, deletedAt: null },
        select: { id: true },
      });

      if (!existing) {
        return null;
      }

      const transaction = await prisma.transaction.update({
        where: { id },
        data: { deletedAt: new Date() },
        include: { category: true },
      });

      return mapTransaction(transaction);
    },

    async undoLast(userId, source) {
      const existing = await prisma.transaction.findFirst({
        where: {
          userId,
          deletedAt: null,
          ...(source ? { source } : {}),
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      if (!existing) {
        return null;
      }

      return this.softDelete(existing.id, userId);
    },

    async update(id, userId, input) {
      const existing = await prisma.transaction.findFirst({
        where: { id, userId, deletedAt: null },
        select: { id: true },
      });

      if (!existing) {
        return null;
      }

      const category = input.category
        ? await findCategoryOrThrow(prisma, input.category)
        : null;
      const transaction = await prisma.transaction.update({
        where: { id },
        data: {
          ...(input.amount !== undefined ? { amount: input.amount } : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(category ? { categoryId: category.id } : {}),
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.merchant !== undefined ? { merchant: input.merchant } : {}),
          ...(input.transactionDate !== undefined
            ? { transactionDate: dateFromDay(input.transactionDate) }
            : {}),
        },
        include: { category: true },
      });

      return mapTransaction(transaction);
    },

    async updateLast(userId, source, input) {
      const existing = await prisma.transaction.findFirst({
        where: {
          userId,
          source,
          deletedAt: null,
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });

      if (!existing) {
        return null;
      }

      return this.update(existing.id, userId, input);
    },
  };
}

async function findCategoryOrThrow(
  prisma: PrismaClient,
  category: CategoryName,
): Promise<{ id: string }> {
  const record = await prisma.category.findUnique({
    where: { name: category },
    select: { id: true },
  });

  if (!record) {
    throw new CategoryNotFoundError(category);
  }

  return record;
}

function dateFromDay(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

function dayFromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

type TransactionWithCategory = {
  id: string;
  userId: string;
  type: TransactionType;
  amount: { toNumber(): number };
  currency: Currency;
  category: { name: string };
  description: string;
  merchant: string | null;
  source: TransactionSource;
  rawMessage: string | null;
  transactionDate: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

function mapTransaction(row: TransactionWithCategory): TransactionRecord {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    amount: row.amount.toNumber(),
    currency: row.currency,
    category: CategoryNameSchema.parse(row.category.name),
    description: row.description,
    merchant: row.merchant,
    source: row.source,
    rawMessage: row.rawMessage,
    transactionDate: dayFromDate(row.transactionDate),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    deletedAt: row.deletedAt?.toISOString() ?? null,
  };
}
