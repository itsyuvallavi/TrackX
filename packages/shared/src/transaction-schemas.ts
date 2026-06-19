// Owner: packages/shared. Transaction schemas shared by API, bot, parser, and web app.
import { z } from "zod";
import { CategoryNameSchema } from "./categories.js";
import { CurrencySchema } from "./currencies.js";

export const TransactionTypeSchema = z.enum([
  "expense",
  "income",
  "transfer",
  "refund",
]);

export const TransactionSourceSchema = z.enum(["telegram", "manual", "import"]);

export const TransactionIdSchema = z.string().uuid();

export const CreateTransactionSchema = z.object({
  userId: z.string().uuid(),
  type: TransactionTypeSchema,
  amount: z.number().positive(),
  currency: CurrencySchema,
  category: CategoryNameSchema,
  description: z.string().min(1),
  merchant: z.string().min(1).nullable().optional(),
  source: TransactionSourceSchema,
  rawMessage: z.string().min(1).nullable().optional(),
  transactionDate: z.string().date(),
});

export const UpdateTransactionSchema = CreateTransactionSchema.pick({
  amount: true,
  currency: true,
  category: true,
  description: true,
  merchant: true,
  transactionDate: true,
}).partial();

export type TransactionType = z.infer<typeof TransactionTypeSchema>;
export type TransactionSource = z.infer<typeof TransactionSourceSchema>;
export type CreateTransactionInput = z.infer<typeof CreateTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
