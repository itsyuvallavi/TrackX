// Owner: packages/api-core. Secure one-time Telegram account linking flow.
import { createHash, randomBytes } from "node:crypto";
import type {
  TelegramLinkCodeRepository,
  TelegramLinkConsumeResult,
} from "../repositories/telegram-link-codes.js";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_CODE_LENGTH = 8;
const DEFAULT_TTL_MS = 15 * 60 * 1000;

export type TelegramLinkService = {
  createLinkCode(userId: string): Promise<{
    code: string;
    expiresAt: Date;
  }>;
  consumeLinkCode(input: {
    code: string;
    telegramUserId: string;
  }): Promise<TelegramLinkConsumeResult>;
};

export type TelegramLinkServiceOptions = {
  now?: () => Date;
  ttlMs?: number;
  codeLength?: number;
};

export function createTelegramLinkService(
  repository: TelegramLinkCodeRepository,
  options: TelegramLinkServiceOptions = {},
): TelegramLinkService {
  const now = options.now ?? (() => new Date());
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const codeLength = options.codeLength ?? DEFAULT_CODE_LENGTH;

  return {
    async createLinkCode(userId) {
      const createdAt = now();
      const expiresAt = new Date(createdAt.getTime() + ttlMs);
      const code = generateLinkCode(codeLength);

      await repository.expireActiveForUser(userId, createdAt);
      await repository.create({
        userId,
        codeHash: hashTelegramLinkCode(code),
        expiresAt,
      });

      return { code, expiresAt };
    },

    async consumeLinkCode(input) {
      const code = normalizeCode(input.code);

      if (!code || !input.telegramUserId.trim()) {
        return { status: "invalid_code" };
      }

      return repository.consumeAndLink({
        codeHash: hashTelegramLinkCode(code),
        telegramUserId: input.telegramUserId.trim(),
        consumedAt: now(),
      });
    },
  };
}

export function hashTelegramLinkCode(code: string): string {
  return createHash("sha256").update(normalizeCode(code)).digest("hex");
}

function normalizeCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}

function generateLinkCode(length: number): string {
  const bytes = randomBytes(length);
  let code = "";

  for (const byte of bytes) {
    code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }

  return code;
}
