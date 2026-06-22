// Owner: packages/db. Local-only demo transaction seed for UI review.
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_LOCAL_TIMEZONE, seedDefaultData } from "../src/seed-data.js";

const prisma = new PrismaClient();

const demoEmail = "yuvalavi12@gmail.com";
const demoTransactions = [
  ["expense", 13.15, "Groceries", "groceries", "Pingo Doce", -3],
  ["expense", 4.7, "Restaurants / Cafes / Fun", "beer and ice cream", null, -2],
  ["expense", 10, "Restaurants / Cafes / Fun", "comedy show", null, -2],
  ["expense", 6.9, "Restaurants / Cafes / Fun", "movie", null, -2],
  ["expense", 3.8, "Transport", "bolt", "Bolt", -1],
  ["expense", 4, "Transport", "Bolt", "Bolt", -1],
  ["expense", 26.29, "Utilities", "EDP", "EDP", -3],
  ["expense", 1.99, "Groceries", "milk", null, -3],
  ["income", 200, "Income", "freelance payment", null, -4],
] as const;

try {
  await seedDefaultData(prisma);

  const user =
    (await prisma.user.findFirst({
      where: { email: demoEmail },
      select: { id: true },
    })) ??
    (await prisma.user.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    }));

  if (!user) {
    throw new Error("No local user found to seed demo transactions.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      defaultCurrency: "EUR",
      timezone: DEFAULT_LOCAL_TIMEZONE,
    },
  });

  for (const [
    type,
    amount,
    categoryName,
    description,
    merchant,
    dayOffset,
  ] of demoTransactions) {
    const category = await prisma.category.findUniqueOrThrow({
      where: { name: categoryName },
      select: { id: true },
    });
    const transactionDate = new Date();
    transactionDate.setDate(transactionDate.getDate() + dayOffset);

    await prisma.transaction.upsert({
      where: {
        id: demoId(user.id, description, amount),
      },
      create: {
        id: demoId(user.id, description, amount),
        userId: user.id,
        type,
        amount,
        currency: "EUR",
        categoryId: category.id,
        description,
        merchant,
        source: "telegram",
        rawMessage: description,
        transactionDate,
      },
      update: {
        type,
        amount,
        currency: "EUR",
        categoryId: category.id,
        description,
        merchant,
        source: "telegram",
        rawMessage: description,
        transactionDate,
        deletedAt: null,
      },
    });
  }

  console.log(
    `Seeded ${demoTransactions.length} demo transactions for ${user.id}.`,
  );
} finally {
  await prisma.$disconnect();
}

function demoId(userId: string, description: string, amount: number): string {
  const input = `${userId}:${description}:${amount}`;
  const hash = createHash("sha1").update(input).digest("hex");

  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    `4${hash.slice(13, 16)}`,
    `8${hash.slice(17, 20)}`,
    hash.slice(20, 32),
  ].join("-");
}
