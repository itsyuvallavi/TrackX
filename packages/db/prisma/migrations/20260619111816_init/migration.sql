-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('EUR', 'USD', 'ILS');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('expense', 'income', 'transfer', 'refund');

-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('expense', 'income');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('week', 'month');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('telegram', 'manual', 'import');

-- CreateEnum
CREATE TYPE "ParseStatus" AS ENUM ('success', 'clarification', 'failure');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "telegramUserId" TEXT,
    "email" TEXT,
    "defaultCurrency" "Currency" NOT NULL DEFAULT 'EUR',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Lisbon',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "CategoryKind" NOT NULL,
    "parentCategoryId" UUID,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "amountEur" DECIMAL(12,2),
    "amountUsd" DECIMAL(12,2),
    "categoryId" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "merchant" TEXT,
    "source" "TransactionSource" NOT NULL,
    "rawMessage" TEXT,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,
    "period" "BudgetPeriod" NOT NULL,
    "limitAmount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" UUID NOT NULL,
    "baseCurrency" "Currency" NOT NULL,
    "quoteCurrency" "Currency" NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "source" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parse_events" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "rawMessage" TEXT NOT NULL,
    "parserResponse" JSONB NOT NULL,
    "status" "ParseStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parse_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_telegramUserId_key" ON "users"("telegramUserId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "categories_kind_idx" ON "categories"("kind");

-- CreateIndex
CREATE INDEX "transactions_userId_transactionDate_idx" ON "transactions"("userId", "transactionDate");

-- CreateIndex
CREATE INDEX "transactions_categoryId_transactionDate_idx" ON "transactions"("categoryId", "transactionDate");

-- CreateIndex
CREATE INDEX "transactions_deletedAt_idx" ON "transactions"("deletedAt");

-- CreateIndex
CREATE INDEX "budgets_userId_period_isActive_idx" ON "budgets"("userId", "period", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_userId_categoryId_period_key" ON "budgets"("userId", "categoryId", "period");

-- CreateIndex
CREATE INDEX "exchange_rates_date_idx" ON "exchange_rates"("date");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_baseCurrency_quoteCurrency_date_source_key" ON "exchange_rates"("baseCurrency", "quoteCurrency", "date", "source");

-- CreateIndex
CREATE INDEX "parse_events_userId_createdAt_idx" ON "parse_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "parse_events_status_idx" ON "parse_events"("status");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parse_events" ADD CONSTRAINT "parse_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
