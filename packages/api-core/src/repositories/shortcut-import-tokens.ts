// Owner: packages/api-core. Shortcut import token repository boundary.
import type { PrismaClient } from "@trackx/db";

export type ShortcutImportTokenRecord = {
  id: string;
  userId: string;
  label: string;
  tokenHash: string;
  tokenPreview: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

export type ShortcutImportTokenRepository = {
  create(input: {
    userId: string;
    label: string;
    tokenHash: string;
    tokenPreview: string;
  }): Promise<ShortcutImportTokenRecord>;
  findActiveByHash(
    tokenHash: string,
  ): Promise<ShortcutImportTokenRecord | null>;
  findActiveByUser(userId: string): Promise<ShortcutImportTokenRecord | null>;
  markUsed(id: string): Promise<void>;
  revokeActiveForUser(userId: string): Promise<void>;
};

export function createPrismaShortcutImportTokenRepository(
  prisma: PrismaClient,
): ShortcutImportTokenRepository {
  return {
    async create(input) {
      return mapToken(await prisma.shortcutImportToken.create({ data: input }));
    },

    async findActiveByHash(tokenHash) {
      const token = await prisma.shortcutImportToken.findFirst({
        where: { tokenHash, revokedAt: null },
      });

      return token ? mapToken(token) : null;
    },

    async findActiveByUser(userId) {
      const token = await prisma.shortcutImportToken.findFirst({
        where: { userId, revokedAt: null },
        orderBy: { createdAt: "desc" },
      });

      return token ? mapToken(token) : null;
    },

    async markUsed(id) {
      await prisma.shortcutImportToken.update({
        where: { id },
        data: { lastUsedAt: new Date() },
      });
    },

    async revokeActiveForUser(userId) {
      await prisma.shortcutImportToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    },
  };
}

function mapToken(token: {
  id: string;
  userId: string;
  label: string;
  tokenHash: string;
  tokenPreview: string;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}): ShortcutImportTokenRecord {
  return {
    id: token.id,
    userId: token.userId,
    label: token.label,
    tokenHash: token.tokenHash,
    tokenPreview: token.tokenPreview,
    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
    revokedAt: token.revokedAt?.toISOString() ?? null,
    createdAt: token.createdAt.toISOString(),
  };
}
