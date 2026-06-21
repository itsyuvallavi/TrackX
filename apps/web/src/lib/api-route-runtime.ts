// Owner: apps/web. Lazy server-only service wiring for Next.js API routes.
import {
  createBudgetService,
  createFromMessageService,
  createHttpParserClient,
  createMessageIntentService,
  createNoopTransactionIntentClient,
  createOpenAiTransactionIntentClient,
  createPrismaBudgetRepository,
  createPrismaParseEventRepository,
  createPrismaPendingClarificationRepository,
  createPrismaTransactionRepository,
  createPrismaUserRepository,
  createTransactionService,
  type BudgetService,
  type FromMessageService,
  type TransactionService,
} from "@trackx/api-core";
import { createPrismaClient, type PrismaClient } from "@trackx/db";

type ApiRouteServices = {
  budgetService: BudgetService;
  fromMessageService: FromMessageService;
  transactionService: TransactionService;
};

let prisma: PrismaClient | null = null;
let services: ApiRouteServices | null = null;

export function getBudgetService(): BudgetService {
  return getServices().budgetService;
}

export function getFromMessageService(): FromMessageService {
  return getServices().fromMessageService;
}

export function getTransactionService(): TransactionService {
  return getServices().transactionService;
}

function getServices(): ApiRouteServices {
  if (services) {
    return services;
  }

  const client = getPrisma();
  const users = createPrismaUserRepository(client);
  const transactionService = createTransactionService(
    users,
    createPrismaTransactionRepository(client),
  );

  services = {
    budgetService: createBudgetService(
      users,
      createPrismaBudgetRepository(client),
    ),
    fromMessageService: createFromMessageService(
      createHttpParserClient(getParserBaseUrl()),
      createPrismaParseEventRepository(client),
      createPrismaPendingClarificationRepository(client),
      transactionService,
      createMessageIntentService(getIntentClient(), transactionService),
    ),
    transactionService,
  };

  return services;
}

function getPrisma(): PrismaClient {
  prisma ??= createPrismaClient();
  return prisma;
}

function getParserBaseUrl(): string {
  return process.env.PARSER_BASE_URL ?? "http://localhost:4002";
}

function getIntentClient() {
  const apiKey = normalizeSecret(process.env.OPENAI_API_KEY);

  if (!apiKey) {
    return createNoopTransactionIntentClient();
  }

  return createOpenAiTransactionIntentClient({
    apiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  });
}

function normalizeSecret(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
