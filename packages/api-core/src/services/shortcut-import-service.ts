// Owner: packages/api-core. iOS Shortcut import orchestration.
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import {
  normalizeCurrency,
  normalizeTimezone,
  type Currency,
} from "@trackx/shared";
import type {
  ShortcutImportTokenRecord,
  ShortcutImportTokenRepository,
} from "../repositories/shortcut-import-tokens.js";
import type {
  FromMessageResponse,
  FromMessageService,
} from "./from-message-service.js";

export class ShortcutImportUnauthorizedError extends Error {
  constructor() {
    super("Unauthorized shortcut import.");
    this.name = "ShortcutImportUnauthorizedError";
  }
}

export class ShortcutImportBadRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShortcutImportBadRequestError";
  }
}

export const AppleWalletImportSchema = z.object({
  source: z.literal("apple_wallet").optional(),
  merchant: z.unknown().optional(),
  amount: z.unknown(),
  card: z.unknown().optional(),
  name: z.unknown().optional(),
  currency: z.string().trim().optional(),
  timezone: z.string().trim().optional(),
  transactionDate: z.string().date().optional(),
});

export type AppleWalletImportInput = z.infer<typeof AppleWalletImportSchema>;

export type ShortcutImportService = {
  createToken(input: {
    userId: string;
    label?: string;
  }): Promise<{ token: string; record: ShortcutImportTokenRecord }>;
  getActiveToken(userId: string): Promise<ShortcutImportTokenRecord | null>;
  importAppleWallet(input: {
    authorization: string | null;
    payload: AppleWalletImportInput;
    correlationId: string;
    defaultTimezone: string;
    defaultCurrency: Currency;
  }): Promise<FromMessageResponse>;
  revokeActiveToken(userId: string): Promise<void>;
};

export function createShortcutImportService(
  tokens: ShortcutImportTokenRepository,
  fromMessage: FromMessageService,
): ShortcutImportService {
  return {
    async createToken(input) {
      await tokens.revokeActiveForUser(input.userId);
      const token = `txs_${randomBytes(24).toString("base64url")}`;
      const record = await tokens.create({
        userId: input.userId,
        label: input.label ?? "iOS Shortcut",
        tokenHash: hashToken(token),
        tokenPreview: previewToken(token),
      });

      return { token, record };
    },

    getActiveToken(userId) {
      return tokens.findActiveByUser(userId);
    },

    async importAppleWallet(input) {
      const bearerToken = parseBearerToken(input.authorization);
      const tokenRecord = await tokens.findActiveByHash(hashToken(bearerToken));

      if (!tokenRecord) {
        throw new ShortcutImportUnauthorizedError();
      }

      const normalized = normalizeAppleWalletPayload(
        input.payload,
        input.defaultCurrency,
      );
      const response = await fromMessage.createFromMessage({
        userId: tokenRecord.userId,
        message: normalized.message,
        timezone: normalizeTimezone(
          input.payload.timezone ?? input.defaultTimezone,
        ),
        defaultCurrency: normalized.currency,
        correlationId: input.correlationId,
        source: "import",
      });
      await tokens.markUsed(tokenRecord.id);

      return response;
    },

    revokeActiveToken(userId) {
      return tokens.revokeActiveForUser(userId);
    },
  };
}

function normalizeAppleWalletPayload(
  payload: AppleWalletImportInput,
  defaultCurrency: Currency,
): { message: string; currency: Currency } {
  const merchant = cleanText(payload.merchant) ?? cleanText(payload.name);
  const card = cleanText(payload.card);
  const amountText = cleanText(payload.amount);

  if (!merchant) {
    throw new ShortcutImportBadRequestError("Missing merchant.");
  }

  if (!amountText) {
    throw new ShortcutImportBadRequestError("Missing amount.");
  }

  const amount = parseAmount(amountText);
  const currency =
    normalizeCurrency(payload.currency ?? "") ??
    currencyFromText(amountText) ??
    currencyFromText(card ?? "") ??
    defaultCurrency;

  return {
    currency,
    message: `${amount} ${currency.toLowerCase()} for ${merchant}`,
  };
}

function parseBearerToken(authorization: string | null): string {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();

  if (!token) {
    throw new ShortcutImportUnauthorizedError();
  }

  return token;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function previewToken(token: string): string {
  return `${token.slice(0, 7)}...${token.slice(-4)}`;
}

function cleanText(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }

  return null;
}

function parseAmount(value: string): number {
  const normalized = value.replace(",", ".").match(/-?\d+(?:\.\d+)?/u)?.[0];
  const amount = normalized ? Number(normalized) : Number.NaN;

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ShortcutImportBadRequestError("Invalid amount.");
  }

  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

function currencyFromText(value: string): Currency | null {
  if (value.includes("€")) {
    return "EUR";
  }

  if (value.includes("$")) {
    return "USD";
  }

  if (value.includes("₪")) {
    return "ILS";
  }

  return normalizeCurrency(value);
}
