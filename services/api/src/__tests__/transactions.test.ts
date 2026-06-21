// Owner: services/api. API transaction route tests with in-memory repositories.
import { describe, expect, it } from "vitest";
import type { ApiConfig } from "@trackx/config";
import {
  type CreateTransactionRecordInput,
  createTransactionService,
  type TransactionRecord,
  type TransactionRepository,
  type TransactionService,
  type UpdateTransactionRecordInput,
  type UserRepository,
} from "@trackx/api-core";
import { buildApiServer } from "../server.js";

const defaultUserId = "00000000-0000-4000-8000-000000000001";
const config: ApiConfig = {
  databaseUrl: "postgresql://postgres:postgres@localhost:5432/trackx",
  redisUrl: "redis://localhost:6379",
  defaultTimezone: "Europe/Lisbon",
  defaultCurrency: "EUR",
  apiPort: 4001,
  apiBaseUrl: "http://localhost:4001",
  parserBaseUrl: "http://localhost:4002",
  openAiApiKey: undefined,
  openAiModel: "gpt-4o-mini",
};

describe("transaction routes", () => {
  it("creates and lists manual transactions for the default user", async () => {
    const server = await serverWithInMemoryService();

    const created = await server.inject({
      method: "POST",
      url: "/transactions",
      payload: {
        type: "expense",
        amount: 15,
        currency: "EUR",
        category: "Restaurants / Cafes / Fun",
        description: "food",
        transactionDate: "2026-06-19",
      },
    });
    const listed = await server.inject({
      method: "GET",
      url: "/transactions",
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      amount: 15,
      category: "Restaurants / Cafes / Fun",
      source: "manual",
    });
    expect(listed.json()).toHaveLength(1);
  });

  it("updates a transaction", async () => {
    const server = await serverWithInMemoryService();
    const created = await createFoodTransaction(server);

    const updated = await server.inject({
      method: "PATCH",
      url: `/transactions/${created.id}`,
      payload: {
        amount: 20,
        category: "Groceries",
        description: "market",
      },
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      amount: 20,
      category: "Groceries",
      description: "market",
    });
  });

  it("soft deletes transactions so they no longer appear in list", async () => {
    const server = await serverWithInMemoryService();
    const created = await createFoodTransaction(server);

    const deleted = await server.inject({
      method: "DELETE",
      url: `/transactions/${created.id}`,
    });
    const listed = await server.inject({
      method: "GET",
      url: "/transactions",
    });

    expect(deleted.statusCode).toBe(200);
    expect(deleted.json().deletedAt).not.toBeNull();
    expect(listed.json()).toEqual([]);
  });

  it("undoes the most recent transaction", async () => {
    const server = await serverWithInMemoryService();
    await createFoodTransaction(server);
    const second = await createFoodTransaction(server, "coffee");

    const undone = await server.inject({
      method: "POST",
      url: "/transactions/undo-last",
      payload: {},
    });

    expect(undone.statusCode).toBe(200);
    expect(undone.json().id).toBe(second.id);
  });

  it("updates the latest matching transaction category", async () => {
    const server = await serverWithInMemoryService();
    await createFoodTransaction(server, "food");
    const second = await createFoodTransaction(server, "movie");

    const updated = await server.inject({
      method: "POST",
      url: "/transactions/update-last-category",
      payload: {
        source: "manual",
        category: "Restaurants / Cafes / Fun",
      },
    });

    expect(updated.statusCode).toBe(200);
    expect(updated.json()).toMatchObject({
      id: second.id,
      description: "movie",
      category: "Restaurants / Cafes / Fun",
    });
  });

  it("returns 400 for invalid create input", async () => {
    const server = await serverWithInMemoryService();
    const response = await server.inject({
      method: "POST",
      url: "/transactions",
      payload: { description: "missing amount" },
    });

    expect(response.statusCode).toBe(400);
  });
});

async function serverWithInMemoryService() {
  return buildApiServer({
    config,
    transactionService: createInMemoryTransactionService(),
  });
}

function createInMemoryTransactionService(): TransactionService {
  const records: TransactionRecord[] = [];
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
      const now = new Date().toISOString();
      const record: TransactionRecord = {
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
      const record = records.find(
        (entry) =>
          entry.id === id &&
          entry.userId === userId &&
          entry.deletedAt === null,
      );

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
      const record = records.find(
        (entry) =>
          entry.id === id &&
          entry.userId === userId &&
          entry.deletedAt === null,
      );

      if (!record) {
        return null;
      }

      Object.assign(record, input, { updatedAt: new Date().toISOString() });
      return record;
    },
    async updateLast(userId, source, input) {
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

function userRecord() {
  return {
    id: defaultUserId,
    defaultCurrency: "EUR" as const,
    timezone: "Europe/Lisbon",
  };
}

async function createFoodTransaction(
  server: Awaited<ReturnType<typeof serverWithInMemoryService>>,
  description = "food",
): Promise<TransactionRecord> {
  const response = await server.inject({
    method: "POST",
    url: "/transactions",
    payload: {
      type: "expense",
      amount: 15,
      currency: "EUR",
      category: "Restaurants / Cafes / Fun",
      description,
      transactionDate: "2026-06-19",
    },
  });

  return response.json() as TransactionRecord;
}
