// Owner: services/api. Fastify server construction for the TrackX API.
import Fastify, { type FastifyInstance } from "fastify";
import type { ApiConfig } from "@trackx/config";
import { createPrismaClient, type PrismaClient } from "@trackx/db";
import { createHttpParserClient } from "./clients/parser-client.js";
import { createPrismaBudgetRepository } from "./repositories/budgets.js";
import { createPrismaParseEventRepository } from "./repositories/parse-events.js";
import { createPrismaPendingClarificationRepository } from "./repositories/pending-clarifications.js";
import { createPrismaTransactionRepository } from "./repositories/transactions.js";
import { createPrismaUserRepository } from "./repositories/users.js";
import { registerBudgetRoutes } from "./routes/budgets.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerTransactionRoutes } from "./routes/transactions.js";
import {
  createNoopTransactionIntentClient,
  createOpenAiTransactionIntentClient,
} from "./clients/intent-client.js";
import {
  createBudgetService,
  type BudgetService,
} from "./services/budget-service.js";
import {
  createFromMessageService,
  type FromMessageService,
} from "./services/from-message-service.js";
import {
  createMessageIntentService,
  type MessageIntentService,
} from "./services/message-intent-service.js";
import {
  createTransactionService,
  type TransactionService,
} from "./services/transaction-service.js";

export type BuildApiServerOptions = {
  config: ApiConfig;
  budgetService?: BudgetService;
  fromMessageService?: FromMessageService;
  prisma?: PrismaClient;
  transactionService?: TransactionService;
};

export async function buildApiServer(
  options: BuildApiServerOptions,
): Promise<FastifyInstance> {
  const server = Fastify({ logger: false });
  const transactionService =
    options.transactionService ??
    createDefaultTransactionService(options.prisma);
  const budgetService =
    options.budgetService ?? createDefaultBudgetService(options.prisma);
  const fromMessageService =
    options.fromMessageService ??
    createDefaultFromMessageService(
      options.config,
      transactionService,
      options.prisma,
    );

  await registerHealthRoutes(server);
  await registerTransactionRoutes(
    server,
    transactionService,
    fromMessageService,
  );
  await registerBudgetRoutes(server, budgetService);

  return server;
}

function createDefaultTransactionService(
  prisma: PrismaClient = createPrismaClient(),
): TransactionService {
  return createTransactionService(
    createPrismaUserRepository(prisma),
    createPrismaTransactionRepository(prisma),
  );
}

function createDefaultBudgetService(
  prisma: PrismaClient = createPrismaClient(),
): BudgetService {
  return createBudgetService(
    createPrismaUserRepository(prisma),
    createPrismaBudgetRepository(prisma),
  );
}

function createDefaultFromMessageService(
  config: ApiConfig,
  transactionService: TransactionService,
  prisma: PrismaClient = createPrismaClient(),
): FromMessageService {
  return createFromMessageService(
    createHttpParserClient(config.parserBaseUrl),
    createPrismaParseEventRepository(prisma),
    createPrismaPendingClarificationRepository(prisma),
    transactionService,
    createDefaultMessageIntentService(config, transactionService),
  );
}

function createDefaultMessageIntentService(
  config: ApiConfig,
  transactionService: TransactionService,
): MessageIntentService {
  const client = config.openAiApiKey
    ? createOpenAiTransactionIntentClient({
        apiKey: config.openAiApiKey,
        model: config.openAiModel,
      })
    : createNoopTransactionIntentClient();

  return createMessageIntentService(client, transactionService);
}
