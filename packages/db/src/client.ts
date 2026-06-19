// Owner: packages/db. Shared Prisma client factory for TrackX services.
import { PrismaClient } from "@prisma/client";

export function createPrismaClient(): PrismaClient {
  return new PrismaClient();
}

export { PrismaClient };
