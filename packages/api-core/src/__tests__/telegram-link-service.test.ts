// Owner: packages/api-core. Tests one-time Telegram link code behavior.
import { describe, expect, it } from "vitest";
import type {
  TelegramLinkCodeRepository,
  TelegramLinkCodeRecord,
  TelegramLinkConsumeResult,
} from "../index.js";
import { createTelegramLinkService, hashTelegramLinkCode } from "../index.js";

describe("createTelegramLinkService", () => {
  it("creates a hashed one-time code and expires older active codes", async () => {
    const repository = inMemoryRepository();
    const service = createTelegramLinkService(repository, {
      now: () => new Date("2026-06-23T10:00:00.000Z"),
      ttlMs: 15 * 60 * 1000,
    });

    const result = await service.createLinkCode(userId);

    expect(result.code).toMatch(/^[A-Z2-9]{8}$/);
    expect(result.expiresAt.toISOString()).toBe("2026-06-23T10:15:00.000Z");
    expect(repository.records).toHaveLength(1);
    expect(repository.records[0]?.userId).toBe(userId);
    expect(repository.records[0]?.codeHash).toBe(
      hashTelegramLinkCode(result.code),
    );
    expect(repository.records[0]?.codeHash).not.toBe(result.code);

    await service.createLinkCode(userId);

    expect(repository.records).toHaveLength(2);
    expect(repository.records[0]?.consumedAt?.toISOString()).toBe(
      "2026-06-23T10:00:00.000Z",
    );
  });

  it("links a Telegram user when the code is valid", async () => {
    const repository = inMemoryRepository();
    const service = createTelegramLinkService(repository, {
      now: () => new Date("2026-06-23T10:00:00.000Z"),
    });
    const { code } = await service.createLinkCode(userId);

    await expect(
      service.consumeLinkCode({
        code: ` ${code.toLowerCase()} `,
        telegramUserId,
      }),
    ).resolves.toEqual({
      status: "linked",
      userId,
      telegramUserId,
    });
    expect(repository.records[0]?.telegramUserId).toBe(telegramUserId);
  });

  it("rejects invalid, consumed, and conflicting codes", async () => {
    const repository = inMemoryRepository();
    const service = createTelegramLinkService(repository, {
      now: () => new Date("2026-06-23T10:00:00.000Z"),
    });
    const { code } = await service.createLinkCode(userId);

    await expect(
      service.consumeLinkCode({ code: "wrong", telegramUserId }),
    ).resolves.toEqual({ status: "invalid_code" });

    await service.consumeLinkCode({ code, telegramUserId });

    await expect(
      service.consumeLinkCode({ code, telegramUserId: "456" }),
    ).resolves.toEqual({ status: "invalid_code" });

    const other = await service.createLinkCode("other-user");
    repository.linkedTelegramUsers.set(telegramUserId, userId);

    await expect(
      service.consumeLinkCode({
        code: other.code,
        telegramUserId,
      }),
    ).resolves.toEqual({ status: "telegram_already_linked" });
  });
});

const userId = "00000000-0000-4000-8000-000000000001";
const telegramUserId = "123";

function inMemoryRepository(): TelegramLinkCodeRepository & {
  records: TelegramLinkCodeRecord[];
  linkedTelegramUsers: Map<string, string>;
} {
  const records: TelegramLinkCodeRecord[] = [];
  const linkedTelegramUsers = new Map<string, string>();

  return {
    records,
    linkedTelegramUsers,

    async create(input) {
      const now = new Date();
      const record: TelegramLinkCodeRecord = {
        id: crypto.randomUUID(),
        userId: input.userId,
        codeHash: input.codeHash,
        expiresAt: input.expiresAt,
        consumedAt: null,
        telegramUserId: null,
        createdAt: now,
        updatedAt: now,
      };

      records.push(record);
      return record;
    },

    async expireActiveForUser(linkUserId, consumedAt) {
      for (const record of records) {
        if (
          record.userId === linkUserId &&
          record.consumedAt === null &&
          record.expiresAt > consumedAt
        ) {
          record.consumedAt = consumedAt;
        }
      }
    },

    async consumeAndLink(input): Promise<TelegramLinkConsumeResult> {
      const record = records.find(
        (entry) =>
          entry.codeHash === input.codeHash &&
          entry.consumedAt === null &&
          entry.expiresAt > input.consumedAt,
      );

      if (!record) {
        return { status: "invalid_code" };
      }

      const linkedUser = linkedTelegramUsers.get(input.telegramUserId);

      if (linkedUser && linkedUser !== record.userId) {
        return { status: "telegram_already_linked" };
      }

      record.consumedAt = input.consumedAt;
      record.telegramUserId = input.telegramUserId;
      linkedTelegramUsers.set(input.telegramUserId, record.userId);

      return {
        status: "linked",
        userId: record.userId,
        telegramUserId: input.telegramUserId,
      };
    },
  };
}
