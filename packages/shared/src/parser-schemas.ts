// Owner: packages/shared. Parser service request and response schemas.
import { z } from "zod";
import { CategoryNameSchema } from "./categories.js";
import { CurrencySchema } from "./currencies.js";
import { TransactionTypeSchema } from "./transaction-schemas.js";

export const ParserRequestSchema = z.object({
  message: z.string().min(1),
  defaultCurrency: CurrencySchema.optional(),
  timezone: z.string().min(1),
});

export const ParsedTransactionSchema = z.object({
  amount: z.number().positive(),
  currency: CurrencySchema,
  type: z.enum(["expense", "income"]),
  category: CategoryNameSchema,
  description: z.string().min(1),
  merchant: z.string().min(1).nullable().optional(),
  confidence: z.number().min(0).max(1),
});

export const ParserResponseSchema = z.object({
  confidence: z.number().min(0).max(1),
  transactions: z.array(ParsedTransactionSchema),
  needsClarification: z.boolean(),
  clarifyingQuestion: z.string().min(1).nullable(),
  parser: z.enum(["deterministic", "openai"]),
});

export type ParserRequest = z.infer<typeof ParserRequestSchema>;
export type ParsedTransaction = z.infer<typeof ParsedTransactionSchema>;
export type ParserResponse = z.infer<typeof ParserResponseSchema>;
