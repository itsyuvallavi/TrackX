// Owner: packages/shared. AI intent schemas for safe transaction message routing.
import { z } from "zod";
import { CategoryNameSchema } from "./categories.js";
import { CurrencySchema } from "./currencies.js";
import {
  TransactionIdSchema,
  TransactionSourceSchema,
} from "./transaction-schemas.js";

export const RecentTransactionContextSchema = z.object({
  id: TransactionIdSchema,
  amount: z.number().positive(),
  currency: CurrencySchema,
  category: CategoryNameSchema,
  description: z.string().min(1),
  merchant: z.string().min(1).nullable(),
  source: TransactionSourceSchema,
  transactionDate: z.string().date(),
});

export const TransactionIntentRequestSchema = z.object({
  message: z.string().min(1),
  timezone: z.string().trim().min(1),
  defaultCurrency: CurrencySchema.optional(),
  recentTransactions: z.array(RecentTransactionContextSchema).max(10),
});

export const TransactionIntentResponseSchema = z.object({
  action: z.enum([
    "create_transaction",
    "update_transaction_category",
    "clarify",
    "unsupported",
  ]),
  transactionId: TransactionIdSchema.nullable(),
  category: CategoryNameSchema.nullable(),
  clarifyingQuestion: z.string().min(1).nullable(),
  confidence: z.number().min(0).max(1),
  reason: z.string().min(1),
  parser: z.enum(["deterministic", "openai"]),
});

export type RecentTransactionContext = z.infer<
  typeof RecentTransactionContextSchema
>;
export type TransactionIntentRequest = z.infer<
  typeof TransactionIntentRequestSchema
>;
export type TransactionIntentResponse = z.infer<
  typeof TransactionIntentResponseSchema
>;
