// Owner: packages/db. Prisma seed entrypoint for local TrackX defaults.
import { PrismaClient } from "@prisma/client";
import { seedDefaultData } from "../src/seed-data.js";

const prisma = new PrismaClient();

try {
  const result = await seedDefaultData(prisma);
  console.log(
    `Seeded ${result.categories} categories, ${result.budgets} budgets, and local user ${result.userId}.`,
  );
} finally {
  await prisma.$disconnect();
}
