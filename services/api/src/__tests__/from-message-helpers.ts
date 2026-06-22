// Owner: services/api. In-memory helpers for from-message route tests.
import type { ApiConfig } from "@trackx/config";
import type { ParserResponse, TransactionIntentResponse } from "@trackx/shared";
import {
  createFromMessageService,
  createMessageIntentService,
  type BudgetAlertService,
  type ExchangeRateService,
  type ParserClient,
  type ParseEventRepository,
  type ParseEventRecord,
  type PendingClarificationRecord,
  type TransactionIntentClient,
  type TransactionRecord,
  type TransactionService,
} from "@trackx/api-core";
import { buildApiServer } from "../server.js";
import { createInMemoryPendingClarificationRepository } from "./in-memory-pending-clarifications.js";
import { createInMemoryTransactionService } from "./in-memory-transactions.js";

export { defaultUserId, transactionRecord } from "./in-memory-transactions.js";
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

export async function createHarness(
  parserResult: ParserResponse | Error | Array<ParserResponse | Error>,
  options: {
    intentResult?:
      | TransactionIntentResponse
      | Error
      | Array<TransactionIntentResponse | Error>;
    budgetWarnings?: string[];
    exchangeRates?: ExchangeRateService;
    seedRecords?: TransactionRecord[];
  } = {},
) {
  const records: TransactionRecord[] = [...(options.seedRecords ?? [])];
  const parseEvents: ParseEventRecord[] = [];
  const parserMessages: string[] = [];
  const intentMessages: string[] = [];
  const pendingClarifications: PendingClarificationRecord[] = [];
  const transactionService = createInMemoryTransactionService(
    records,
    options.exchangeRates,
  );
  const fromMessageService = createInMemoryFromMessageService(
    parserResult,
    parseEvents,
    parserMessages,
    intentMessages,
    pendingClarifications,
    transactionService,
    options.intentResult,
    options.budgetWarnings,
  );
  const server = await buildApiServer({
    config,
    transactionService,
    fromMessageService,
  });

  return {
    server,
    records,
    parseEvents,
    parserMessages,
    intentMessages,
    pendingClarifications,
  };
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

export function intentResponse(
  overrides: Partial<TransactionIntentResponse> = {},
): TransactionIntentResponse {
  return {
    action: "create_transaction",
    transactionId: null,
    category: null,
    clarifyingQuestion: null,
    confidence: 1,
    reason: "test intent",
    parser: "openai",
    ...overrides,
  };
}

function createInMemoryFromMessageService(
  parserResult: ParserResponse | Error | Array<ParserResponse | Error>,
  parseEvents: ParseEventRecord[],
  parserMessages: string[],
  intentMessages: string[],
  pendingClarifications: PendingClarificationRecord[],
  transactions: TransactionService,
  intentResult?:
    | TransactionIntentResponse
    | Error
    | Array<TransactionIntentResponse | Error>,
  budgetWarnings?: string[],
) {
  const parserResults = Array.isArray(parserResult)
    ? [...parserResult]
    : [parserResult];
  let parserCallCount = 0;
  const parser: ParserClient = {
    async parseTransaction(input) {
      parserMessages.push(input.message);
      const result =
        parserResults[Math.min(parserCallCount, parserResults.length - 1)];
      parserCallCount += 1;

      if (result instanceof Error) {
        throw result;
      }

      if (!result) {
        throw new Error("No parser result configured.");
      }

      return result;
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
  const pending = createInMemoryPendingClarificationRepository(
    pendingClarifications,
  );
  const intentService =
    intentResult === undefined
      ? undefined
      : createMessageIntentService(
          createIntentClient(intentResult, intentMessages),
          transactions,
        );

  return createFromMessageService(
    parser,
    events,
    pending,
    transactions,
    intentService,
    createBudgetAlertService(budgetWarnings),
  );
}

function createBudgetAlertService(
  warnings: string[] | undefined,
): BudgetAlertService | undefined {
  if (!warnings) {
    return undefined;
  }

  return {
    async warningsForTransactions() {
      return warnings;
    },
  };
}

function createIntentClient(
  intentResult:
    | TransactionIntentResponse
    | Error
    | Array<TransactionIntentResponse | Error>,
  intentMessages: string[],
): TransactionIntentClient {
  const intentResults = Array.isArray(intentResult)
    ? [...intentResult]
    : [intentResult];
  let intentCallCount = 0;

  return {
    async classify(input) {
      intentMessages.push(input.message);
      const result =
        intentResults[Math.min(intentCallCount, intentResults.length - 1)];
      intentCallCount += 1;

      if (result instanceof Error) {
        throw result;
      }

      if (!result) {
        throw new Error("No intent result configured.");
      }

      return result;
    },
  };
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
