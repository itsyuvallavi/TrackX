// Owner: apps/web. Lazy server-only service wiring for Next.js API routes.
import {
  createBudgetAlertService,
  createBudgetService,
  createFromMessageService,
  createMessageIntentService,
  createMessageEventService,
  createNoopTransactionIntentClient,
  createOpenAiTransactionIntentClient,
  createExchangeRateService,
  createPrismaBudgetRepository,
  createPrismaExchangeRateRepository,
  createPrismaMerchantCategoryRuleRepository,
  createPrismaMessageEventRepository,
  createPrismaParseEventRepository,
  createPrismaPendingClarificationRepository,
  createPrismaShortcutImportTokenRepository,
  createPrismaTelegramLinkCodeRepository,
  createPrismaTransactionRepository,
  createPrismaUserRepository,
  createShortcutImportService,
  createTelegramLinkService,
  createTransactionService,
  type BudgetService,
  type FromMessageService,
  type MessageEventService,
  type ParserClient,
  type ShortcutImportService,
  type TelegramLinkService,
  ParserClientError,
  type TransactionService,
  type UserRepository,
} from "@trackx/api-core";
import { createPrismaClient, type PrismaClient } from "@trackx/db";
import { createOpenAiParser } from "@trackx/parser-core";
import { sendBetterStackLog } from "@trackx/shared";
import { after } from "next/server";

type ApiRouteServices = {
  budgetService: BudgetService;
  fromMessageService: FromMessageService;
  messageEventService: MessageEventService;
  shortcutImportService: ShortcutImportService;
  telegramLinkService: TelegramLinkService;
  transactionService: TransactionService;
  userRepository: UserRepository;
};

let prisma: PrismaClient | null = null;
let services: ApiRouteServices | null = null;

export function getBudgetService(): BudgetService {
  return getServices().budgetService;
}

export function getFromMessageService(): FromMessageService {
  return getServices().fromMessageService;
}

export function getMessageEventService(): MessageEventService {
  return getServices().messageEventService;
}

export function getShortcutImportService(): ShortcutImportService {
  return getServices().shortcutImportService;
}

export function getTransactionService(): TransactionService {
  return getServices().transactionService;
}

export function getTelegramLinkService(): TelegramLinkService {
  return getServices().telegramLinkService;
}

export function getUserRepository(): UserRepository {
  return getServices().userRepository;
}

function getServices(): ApiRouteServices {
  if (services) {
    return services;
  }

  const client = getPrisma();
  const users = createPrismaUserRepository(client);
  const budgetService = createBudgetService(
    users,
    createPrismaBudgetRepository(client),
  );
  const exchangeRateService = createExchangeRateService(
    createPrismaExchangeRateRepository(client),
  );
  const merchantCategoryRules =
    createPrismaMerchantCategoryRuleRepository(client);
  const transactionService = createTransactionService(
    users,
    createPrismaTransactionRepository(client),
    exchangeRateService,
    merchantCategoryRules,
  );
  const messageEventService = createMessageEventService(
    createPrismaMessageEventRepository(client),
    {
      async record(event) {
        await sendBetterStackLog(
          {
            sourceToken: process.env.BETTER_STACK_SOURCE_TOKEN,
            ingestingHost: process.env.BETTER_STACK_INGESTING_HOST,
          },
          {
            message: event.eventType,
            service: event.source,
            correlationId: event.correlationId,
            eventType: event.eventType,
            status: event.status,
            errorMessage: event.errorMessage,
            metadata: event.metadata,
            environment: process.env.VERCEL_ENV ?? "local",
          },
        );
      },
    },
    (task) => after(task),
  );

  services = {
    budgetService,
    fromMessageService: createFromMessageService(
      getParserClient(),
      createPrismaParseEventRepository(client),
      createPrismaPendingClarificationRepository(client),
      transactionService,
      createMessageIntentService(getIntentClient(), transactionService),
      createBudgetAlertService(budgetService),
      messageEventService,
      merchantCategoryRules,
    ),
    messageEventService,
    shortcutImportService: createShortcutImportService(
      createPrismaShortcutImportTokenRepository(client),
      createFromMessageService(
        getParserClient(),
        createPrismaParseEventRepository(client),
        createPrismaPendingClarificationRepository(client),
        transactionService,
        createMessageIntentService(getIntentClient(), transactionService),
        createBudgetAlertService(budgetService),
        messageEventService,
        merchantCategoryRules,
      ),
    ),
    telegramLinkService: createTelegramLinkService(
      createPrismaTelegramLinkCodeRepository(client),
    ),
    transactionService,
    userRepository: users,
  };

  return services;
}

function getPrisma(): PrismaClient {
  prisma ??= createPrismaClient();
  return prisma;
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

function getParserClient(): ParserClient {
  const apiKey = normalizeSecret(process.env.OPENAI_API_KEY);

  if (!apiKey) {
    return {
      async parseTransaction() {
        throw new ParserClientError("Parser requires OPENAI_API_KEY.");
      },
    };
  }

  const parseTransaction = createOpenAiParser({
    apiKey,
    model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  });

  return { parseTransaction };
}

function normalizeSecret(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
