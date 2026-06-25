// Owner: packages/db. Shared Prisma client factory for TrackX services.
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";

export function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return new PrismaClient();
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export { Prisma, PrismaClient };
