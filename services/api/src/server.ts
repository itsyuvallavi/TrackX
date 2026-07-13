// Owner: services/api. Fastify server construction for the TrackX API.
import Fastify, { type FastifyInstance } from "fastify";
import type { ApiConfig } from "@trackx/config";
import { createPrismaClient, type PrismaClient } from "@trackx/db";
import {
  createBudgetAlertService,
  createBudgetService,
  createExchangeRateService,
  createFromMessageService,
  createHttpParserClient,
  createMessageIntentService,
  createNoopTransactionIntentClient,
  createOpenAiTransactionIntentClient,
  createPrismaBudgetRepository,
  createPrismaExchangeRateRepository,
  createPrismaMerchantCategoryRuleRepository,
  createPrismaParseEventRepository,
  createPrismaPendingClarificationRepository,
  createPrismaTransactionRepository,
  createPrismaUserRepository,
  createTransactionService,
  type BudgetService,
  type FromMessageService,
  type MessageIntentService,
  type TransactionService,
} from "@trackx/api-core";
import { registerBudgetRoutes } from "./routes/budgets.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerTransactionRoutes } from "./routes/transactions.js";

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
      budgetService,
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
    createExchangeRateService(createPrismaExchangeRateRepository(prisma)),
    createPrismaMerchantCategoryRuleRepository(prisma),
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
  budgetService: BudgetService,
  prisma: PrismaClient = createPrismaClient(),
): FromMessageService {
  const merchantCategoryRules =
    createPrismaMerchantCategoryRuleRepository(prisma);

  return createFromMessageService(
    createHttpParserClient(config.parserBaseUrl),
    createPrismaParseEventRepository(prisma),
    createPrismaPendingClarificationRepository(prisma),
    transactionService,
    createDefaultMessageIntentService(config, transactionService),
    createBudgetAlertService(budgetService),
    undefined,
    merchantCategoryRules,
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
