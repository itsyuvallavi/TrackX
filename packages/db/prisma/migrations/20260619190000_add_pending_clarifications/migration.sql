-- CreateEnum
CREATE TYPE "PendingClarificationStatus" AS ENUM ('active', 'resolved');

-- CreateTable
CREATE TABLE "pending_clarifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "telegramUserId" TEXT,
    "originalMessage" TEXT NOT NULL,
    "clarifyingQuestion" TEXT,
    "status" "PendingClarificationStatus" NOT NULL DEFAULT 'active',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_clarifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pending_clarifications_userId_status_expiresAt_idx" ON "pending_clarifications"("userId", "status", "expiresAt");

-- CreateIndex
CREATE INDEX "pending_clarifications_telegramUserId_status_idx" ON "pending_clarifications"("telegramUserId", "status");

-- AddForeignKey
ALTER TABLE "pending_clarifications" ADD CONSTRAINT "pending_clarifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
