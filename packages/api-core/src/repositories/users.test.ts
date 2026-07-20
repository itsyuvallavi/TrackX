// Owner: packages/api-core. Verifies provider identities resolve to stable TrackX users.
import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@trackx/db";
import {
  AuthIdentityConflictError,
  createPrismaUserRepository,
} from "./users.js";

describe("createPrismaUserRepository auth identities", () => {
  it("returns the linked TrackX user instead of the provider user ID", async () => {
    const update = vi.fn();
    const prisma = {
      authIdentity: {
        findUnique: vi.fn().mockResolvedValue({
          id: "identity-id",
          email: "yuval@example.com",
          user: {
            id: "stable-trackx-id",
            defaultCurrency: "EUR",
            timezone: "Europe/Lisbon",
          },
        }),
        update,
      },
      user: { create: vi.fn(), findUnique: vi.fn() },
    } as unknown as PrismaClient;

    const result = await createPrismaUserRepository(prisma).ensureAuthUser({
      provider: "neon",
      providerUserId: "neon-user-id",
      email: "yuval@example.com",
    });

    expect(result.id).toBe("stable-trackx-id");
    expect(update).not.toHaveBeenCalled();
  });

  it("does not claim an existing account by matching email alone", async () => {
    const prisma = {
      authIdentity: { findUnique: vi.fn().mockResolvedValue(null) },
      user: {
        findUnique: vi.fn().mockResolvedValue({ id: "existing-user-id" }),
      },
    } as unknown as PrismaClient;

    const promise = createPrismaUserRepository(prisma).ensureAuthUser({
      provider: "neon",
      providerUserId: "unlinked-neon-user-id",
      email: "yuval@example.com",
    });

    await expect(promise).rejects.toBeInstanceOf(AuthIdentityConflictError);
  });

  it("creates a new TrackX user and provider identity together", async () => {
    const category = { upsert: vi.fn(), findUniqueOrThrow: vi.fn() };
    category.findUniqueOrThrow.mockResolvedValue({ id: "category-id" });
    const tx = { category, budget: { upsert: vi.fn() } };
    const prisma = {
      authIdentity: { findUnique: vi.fn().mockResolvedValue(null) },
      user: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: "new-trackx-id",
          defaultCurrency: "EUR",
          timezone: "Europe/Lisbon",
        }),
      },
      $transaction: vi.fn(async (callback) => callback(tx)),
    } as unknown as PrismaClient;

    const result = await createPrismaUserRepository(prisma).ensureAuthUser({
      provider: "neon",
      providerUserId: "new-neon-user-id",
      email: "new@example.com",
    });

    expect(result.id).toBe("new-trackx-id");
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authIdentities: {
            create: expect.objectContaining({
              provider: "neon",
              providerUserId: "new-neon-user-id",
            }),
          },
        }),
      }),
    );
  });
});
