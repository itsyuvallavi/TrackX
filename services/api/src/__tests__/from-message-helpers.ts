// Owner: services/api. In-memory helpers for from-message route tests.
import type { ApiConfig } from "@trackx/config";
import type { ParserResponse } from "@trackx/shared";
import { buildApiServer } from "../server.js";
import type { ParserClient } from "../clients/parser-client.js";
import type {
  ParseEventRepository,
  ParseEventRecord,
} from "../repositories/parse-events.js";
import type { UserRepository } from "../repositories/users.js";
import {
  createFromMessageService,
  type FromMessageService,
} from "../services/from-message-service.js";
import {
  createTransactionService,
  type TransactionService,
} from "../services/transaction-service.js";
import type {
  CreateTransactionRecordInput,
  TransactionRecord,
  TransactionRepository,
  UpdateTransactionRecordInput,
} from "../repositories/transactions.js";

const defaultUserId = "00000000-0000-4000-8000-000000000001";
const config: ApiConfig = {
  databaseUrl: "postgresql://postgres:postgres@localhost:5432/trackx",
  redisUrl: "redis://localhost:6379",
  defaultTimezone: "Europe/Lisbon",
  defaultCurrency: "EUR",
  apiPort: 4001,
  apiBaseUrl: "http://localhost:4001",
  parserBaseUrl: "http://localhost:4002",
};

export async function createHarness(parserResult: ParserResponse | Error) {
  const records: TransactionRecord[] = [];
  const parseEvents: ParseEventRecord[] = [];
  const transactionService = createInMemoryTransactionService(records);
  const fromMessageService = createInMemoryFromMessageService(
    parserResult,
    parseEvents,
    transactionService,
  );
  const server = await buildApiServer({
    config,
    transactionService,
    fromMessageService,
  });

  return { server, records, parseEvents };
}

export function foodResponse(): ParserResponse {
  return {
    confidence: 0.9,
    transactions: [
      {
        amount: 15,
        currency: "EUR",
        type: "expense",
        category: "Restaurants / Cafes / Fun",
        description: "food",
        merchant: null,
        confidence: 0.9,
      },
    ],
    needsClarification: false,
    clarifyingQuestion: null,
    parser: "openai",
  };
}

export function splitResponse(): ParserResponse {
  return {
    confidence: 0.9,
    transactions: [
      parsedExpense(20, "wipes"),
      parsedExpense(30, "new coffee maker"),
    ],
    needsClarification: false,
    clarifyingQuestion: null,
    parser: "openai",
  };
}

export function incomeResponse(): ParserResponse {
  return {
    confidence: 0.9,
    transactions: [
      {
        amount: 200,
        currency: "USD",
        type: "income",
        category: "Income",
        description: "income",
        merchant: null,
        confidence: 0.9,
      },
    ],
    needsClarification: false,
    clarifyingQuestion: null,
    parser: "openai",
  };
}

export function clarificationResponse(): ParserResponse {
  return {
    confidence: 0,
    transactions: [],
    needsClarification: true,
    clarifyingQuestion: "What amount and currency was this?",
    parser: "openai",
  };
}

function createInMemoryFromMessageService(
  parserResult: ParserResponse | Error,
  parseEvents: ParseEventRecord[],
  transactions: TransactionService,
): FromMessageService {
  const parser: ParserClient = {
    async parseTransaction() {
      if (parserResult instanceof Error) {
        throw parserResult;
      }

      return parserResult;
    },
  };
  const events: ParseEventRepository = {
    async create(input) {
      const event = {
        id: crypto.randomUUID(),
        userId: input.userId,
        rawMessage: input.rawMessage,
        status: input.status,
        createdAt: new Date().toISOString(),
      };

      parseEvents.push(event);
      return event;
    },
  };

  return createFromMessageService(parser, events, transactions);
}

function createInMemoryTransactionService(
  records: TransactionRecord[],
): TransactionService {
  const users: UserRepository = {
    async ensureDefaultUser() {
      return userRecord();
    },
    async findById(userId) {
      return userId === defaultUserId ? userRecord() : null;
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
  };

  return createTransactionService(users, transactions);
}

function parsedExpense(amount: number, description: string) {
  return {
    amount,
    currency: "EUR" as const,
    type: "expense" as const,
    category: "Home" as const,
    description,
    merchant: null,
    confidence: 0.9,
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
