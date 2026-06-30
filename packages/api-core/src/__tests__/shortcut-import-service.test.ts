// Owner: packages/api-core. Tests iOS Shortcut import token and payload behavior.
import { describe, expect, it, vi } from "vitest";
import type {
  ShortcutImportTokenRecord,
  ShortcutImportTokenRepository,
} from "../repositories/shortcut-import-tokens.js";
import type { FromMessageService } from "../services/from-message-service.js";
import {
  ShortcutImportBadRequestError,
  ShortcutImportUnauthorizedError,
  createShortcutImportService,
} from "../services/shortcut-import-service.js";

describe("createShortcutImportService", () => {
  it("creates a hashed token and revokes older active tokens", async () => {
    const tokens = inMemoryTokenRepository();
    const service = createShortcutImportService(tokens, fromMessageService());

    const first = await service.createToken({ userId });
    const second = await service.createToken({ userId });

    expect(first.token).toMatch(/^txs_/u);
    expect(tokens.records[0]?.tokenHash).not.toBe(first.token);
    expect(tokens.records[0]?.revokedAt).toBeInstanceOf(Date);
    expect(second.record.tokenPreview).toContain("...");
    expect(await service.getActiveToken(userId)).toEqual(second.record);
  });

  it("rejects missing and unknown bearer tokens", async () => {
    const service = createShortcutImportService(
      inMemoryTokenRepository(),
      fromMessageService(),
    );

    await expect(
      service.importAppleWallet({
        authorization: null,
        payload: { merchant: "Too Good To Go", amount: "$4.56" },
        correlationId: "trace-1",
        defaultTimezone: "Europe/Lisbon",
        defaultCurrency: "EUR",
      }),
    ).rejects.toBeInstanceOf(ShortcutImportUnauthorizedError);

    await expect(
      service.importAppleWallet({
        authorization: "Bearer txs_unknown",
        payload: { merchant: "Too Good To Go", amount: "$4.56" },
        correlationId: "trace-1",
        defaultTimezone: "Europe/Lisbon",
        defaultCurrency: "EUR",
      }),
    ).rejects.toBeInstanceOf(ShortcutImportUnauthorizedError);
  });

  it("turns Apple Wallet fields into an import message", async () => {
    const tokens = inMemoryTokenRepository();
    const fromMessage = fromMessageService();
    const service = createShortcutImportService(tokens, fromMessage);
    const { token } = await service.createToken({ userId });

    const response = await service.importAppleWallet({
      authorization: `Bearer ${token}`,
      payload: {
        merchant: "Too Good To Go",
        amount: "$4.56",
        card: "Apple Card",
      },
      correlationId: "trace-2",
      defaultTimezone: "Europe/Lisbon",
      defaultCurrency: "EUR",
    });

    expect(fromMessage.createFromMessage).toHaveBeenCalledWith({
      userId,
      message: "4.56 usd for Too Good To Go",
      timezone: "Europe/Lisbon",
      defaultCurrency: "USD",
      correlationId: "trace-2",
      source: "import",
    });
    expect(response.feedback).toBe("Logged 4.56 USD for Restaurants.");
    expect(tokens.records[0]?.lastUsedAt).toBeInstanceOf(Date);
  });

  it("requires merchant and amount fields", async () => {
    const tokens = inMemoryTokenRepository();
    const service = createShortcutImportService(tokens, fromMessageService());
    const { token } = await service.createToken({ userId });

    await expect(
      service.importAppleWallet({
        authorization: `Bearer ${token}`,
        payload: { amount: "$4.56" },
        correlationId: "trace-3",
        defaultTimezone: "Europe/Lisbon",
        defaultCurrency: "EUR",
      }),
    ).rejects.toBeInstanceOf(ShortcutImportBadRequestError);

    await expect(
      service.importAppleWallet({
        authorization: `Bearer ${token}`,
        payload: { merchant: "Too Good To Go", amount: "" },
        correlationId: "trace-3",
        defaultTimezone: "Europe/Lisbon",
        defaultCurrency: "EUR",
      }),
    ).rejects.toBeInstanceOf(ShortcutImportBadRequestError);
  });
});

const userId = "00000000-0000-4000-8000-000000000001";

function fromMessageService(): FromMessageService {
  return {
    createFromMessage: vi.fn(async (input) => ({
      transactions: [
        {
          id: "transaction-1",
          userId: input.userId ?? userId,
          type: "expense",
          amount: 4.56,
          currency: input.defaultCurrency ?? "EUR",
          category: "Restaurants / Cafes / Fun",
          description: "Too Good To Go",
          merchant: "Too Good To Go",
          source: input.source,
          rawMessage: input.message,
          transactionDate: "2026-06-30",
          createdAt: "2026-06-30T12:00:00.000Z",
          updatedAt: "2026-06-30T12:00:00.000Z",
          deletedAt: null,
        },
      ],
      needsClarification: false,
      clarifyingQuestion: null,
      feedback: `Logged 4.56 ${input.defaultCurrency ?? "EUR"} for Restaurants.`,
      parser: "openai",
    })),
  };
}

function inMemoryTokenRepository(): ShortcutImportTokenRepository & {
  records: ShortcutImportTokenRecord[];
} {
  const records: ShortcutImportTokenRecord[] = [];

  return {
    records,

    async create(input) {
      const now = new Date();
      const record = {
        id: crypto.randomUUID(),
        userId: input.userId,
        label: input.label,
        tokenHash: input.tokenHash,
        tokenPreview: input.tokenPreview,
        lastUsedAt: null,
        revokedAt: null,
        createdAt: now,
        updatedAt: now,
      };

      records.push(record);
      return record;
    },

    async findActiveByHash(tokenHash) {
      return (
        records.find(
          (record) => record.tokenHash === tokenHash && !record.revokedAt,
        ) ?? null
      );
    },

    async findActiveByUser(findUserId) {
      return (
        records.find(
          (record) => record.userId === findUserId && !record.revokedAt,
        ) ?? null
      );
    },

    async markUsed(id) {
      const record = records.find((entry) => entry.id === id);
      if (record) {
        record.lastUsedAt = new Date();
      }
    },

    async revokeActiveForUser(revokeUserId) {
      for (const record of records) {
        if (record.userId === revokeUserId && !record.revokedAt) {
          record.revokedAt = new Date();
        }
      }
    },
  };
}
