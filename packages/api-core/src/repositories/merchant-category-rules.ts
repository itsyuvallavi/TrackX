// Owner: packages/api-core. Per-user merchant category memory boundary.
import { CategoryNameSchema, type CategoryName } from "@trackx/shared";
import type { PrismaClient } from "@trackx/db";

export type MerchantCategoryRuleSource =
  | "manual"
  | "telegram_correction"
  | "import_correction";

export type MerchantCategoryRuleRecord = {
  id: string;
  userId: string;
  merchantPattern: string;
  normalizedMerchant: string;
  category: CategoryName;
  source: MerchantCategoryRuleSource;
  createdAt: string;
  updatedAt: string;
};

export type UpsertMerchantCategoryRuleInput = {
  userId: string;
  merchant: string;
  category: CategoryName;
  source: MerchantCategoryRuleSource;
};

export type MerchantCategoryRuleRepository = {
  findByMerchant(
    userId: string,
    merchant: string,
  ): Promise<MerchantCategoryRuleRecord | null>;
  upsert(
    input: UpsertMerchantCategoryRuleInput,
  ): Promise<MerchantCategoryRuleRecord | null>;
};

export function createPrismaMerchantCategoryRuleRepository(
  prisma: PrismaClient,
): MerchantCategoryRuleRepository {
  return {
    async findByMerchant(userId, merchant) {
      const normalizedMerchant = normalizeMerchantForRule(merchant);

      if (!normalizedMerchant) {
        return null;
      }

      const rule = await prisma.merchantCategoryRule.findUnique({
        where: {
          userId_normalizedMerchant: {
            userId,
            normalizedMerchant,
          },
        },
        include: { category: true },
      });

      return rule ? mapMerchantCategoryRule(rule) : null;
    },

    async upsert(input) {
      const merchantPattern = input.merchant.trim();
      const normalizedMerchant = normalizeMerchantForRule(merchantPattern);

      if (!normalizedMerchant) {
        return null;
      }

      const category = await prisma.category.findUniqueOrThrow({
        where: { name: input.category },
        select: { id: true },
      });

      const rule = await prisma.merchantCategoryRule.upsert({
        where: {
          userId_normalizedMerchant: {
            userId: input.userId,
            normalizedMerchant,
          },
        },
        create: {
          userId: input.userId,
          categoryId: category.id,
          merchantPattern,
          normalizedMerchant,
          source: input.source,
        },
        update: {
          categoryId: category.id,
          merchantPattern,
          source: input.source,
        },
        include: { category: true },
      });

      return mapMerchantCategoryRule(rule);
    },
  };
}

export function normalizeMerchantForRule(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .replace(/\s+/gu, " ");
}

function mapMerchantCategoryRule(rule: {
  id: string;
  userId: string;
  merchantPattern: string;
  normalizedMerchant: string;
  source: MerchantCategoryRuleSource;
  createdAt: Date;
  updatedAt: Date;
  category: { name: string };
}): MerchantCategoryRuleRecord {
  return {
    id: rule.id,
    userId: rule.userId,
    merchantPattern: rule.merchantPattern,
    normalizedMerchant: rule.normalizedMerchant,
    category: CategoryNameSchema.parse(rule.category.name),
    source: rule.source,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
  };
}
