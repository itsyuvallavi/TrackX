// Owner: packages/api-core. Public schema for natural-language message ingestion.
import { z } from "zod";
import {
  CategoryNameSchema,
  CurrencySchema,
  TransactionSourceSchema,
  type ParserResponse,
} from "@trackx/shared";
import type { TransactionRecord } from "../repositories/transactions.js";

export const FromMessageSchema = z.object({
  message: z.string().min(1),
  userId: z.string().uuid().optional(),
  telegramUserId: z.string().min(1).optional(),
  timezone: z.string().trim().min(1),
  defaultCurrency: CurrencySchema.optional(),
  correlationId: z.string().min(1).optional(),
  source: TransactionSourceSchema.default("telegram"),
  categoryOverride: CategoryNameSchema.optional(),
});

export type FromMessageInput = z.infer<typeof FromMessageSchema>;

export type FromMessageResponse = {
  transactions: TransactionRecord[];
  needsClarification: boolean;
  clarifyingQuestion: string | null;
  feedback: string;
  parser: ParserResponse["parser"] | null;
};
