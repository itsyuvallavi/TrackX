// Owner: services/api. In-memory transaction repository helpers for API tests.
import {
  type CreateTransactionRecordInput,
  createTransactionService,
  type TransactionRecord,
  type TransactionRepository,
  type TransactionService,
  type UpdateTransactionRecordInput,
  type UserRepository,
} from "@trackx/api-core";

export const defaultUserId = "00000000-0000-4000-8000-000000000001";

export function createInMemoryTransactionService(
  records: TransactionRecord[],
): TransactionService {
  const users: UserRepository = {
    async ensureAuthUser() {
      return userRecord();
    },
    async ensureDefaultUser() {
      return userRecord();
    },
    async ensureTelegramUser() {
      return userRecord();
    },
    async findById(userId) {
      return userId === defaultUserId ? userRecord() : null;
    },
    async findByTelegramUserId() {
      return userRecord();
    },
  };
  const transactions: TransactionRepository = {
    async create(input) {
      const record = toTransactionRecord(input, new Date().toISOString());
      records.push(record);
      return record;
    },
    async listByUser(userId) {
      return records.filter(
        (record) => record.userId === userId && record.deletedAt === null,
      );
    },
    async listRecentByUser(userId, limit) {
      return [...records]
        .filter(
          (record) => record.userId === userId && record.deletedAt === null,
        )
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, limit);
    },
    async softDelete(id, userId) {
      const record = findActive(records, id, userId);

      if (!record) {
        return null;
      }

      record.deletedAt = new Date().toISOString();
      return record;
    },
    async undoLast(userId, source) {
      const record = records
        .filter(
          (entry) =>
            entry.userId === userId &&
            entry.deletedAt === null &&
            (!source || entry.source === source),
        )
        .at(-1);

      if (!record) {
        return null;
      }

      record.deletedAt = new Date().toISOString();
      return record;
    },
    async update(id, userId, input: UpdateTransactionRecordInput) {
      const record = findActive(records, id, userId);

      if (!record) {
        return null;
      }

      Object.assign(record, input, { updatedAt: new Date().toISOString() });
      return record;
    },
    async updateLast(userId, source, input: UpdateTransactionRecordInput) {
      const record = records
        .filter(
          (entry) =>
            entry.userId === userId &&
            entry.source === source &&
            entry.deletedAt === null,
        )
        .at(-1);

      if (!record) {
        return null;
      }

      Object.assign(record, input, { updatedAt: new Date().toISOString() });
      return record;
    },
  };

  return createTransactionService(users, transactions);
}

export function transactionRecord(
  overrides: Partial<TransactionRecord> = {},
): TransactionRecord {
  const now = new Date().toISOString();

  return {
    id: "10000000-0000-4000-8000-000000000001",
    userId: defaultUserId,
    type: "expense",
    amount: 6.9,
    currency: "EUR",
    category: "Misc",
    description: "movie",
    merchant: null,
    source: "telegram",
    rawMessage: "6.90 euro for a movie",
    transactionDate: "2026-06-20",
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

function userRecord() {
  return {
    id: defaultUserId,
    defaultCurrency: "EUR" as const,
    timezone: "Europe/Lisbon",
  };
}

function findActive(
  records: TransactionRecord[],
  id: string,
  userId: string,
): TransactionRecord | null {
  return (
    records.find(
      (entry) =>
        entry.id === id && entry.userId === userId && entry.deletedAt === null,
    ) ?? null
  );
}

function toTransactionRecord(
  input: CreateTransactionRecordInput,
  now: string,
): TransactionRecord {
  return {
    id: crypto.randomUUID(),
    userId: input.userId,
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    category: input.category,
    description: input.description,
    merchant: input.merchant,
    source: input.source,
    rawMessage: input.rawMessage,
    transactionDate: input.transactionDate,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}
