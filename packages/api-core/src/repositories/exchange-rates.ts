// Owner: packages/api-core. Exchange-rate cache repository for Prisma.
import type { Currency } from "@trackx/shared";
import type { PrismaClient } from "@trackx/db";
import type {
  ExchangeRateRecord,
  ExchangeRateRepository,
} from "../services/exchange-rate-service.js";

export function createPrismaExchangeRateRepository(
  prisma: PrismaClient,
): ExchangeRateRepository {
  return {
    async find(input) {
      const rate = await prisma.exchangeRate.findUnique({
        where: {
          baseCurrency_quoteCurrency_date_source: {
            baseCurrency: input.baseCurrency,
            quoteCurrency: input.quoteCurrency,
            date: dateFromDay(input.date),
            source: input.source,
          },
        },
      });

      return rate ? mapExchangeRate(rate) : null;
    },

    async findLatest(input) {
      const rate = await prisma.exchangeRate.findFirst({
        where: {
          baseCurrency: input.baseCurrency,
          quoteCurrency: input.quoteCurrency,
          source: input.source,
          date: { lte: dateFromDay(input.onOrBefore) },
        },
        orderBy: { date: "desc" },
      });

      return rate ? mapExchangeRate(rate) : null;
    },

    async upsert(input) {
      const rate = await prisma.exchangeRate.upsert({
        where: {
          baseCurrency_quoteCurrency_date_source: {
            baseCurrency: input.baseCurrency,
            quoteCurrency: input.quoteCurrency,
            date: dateFromDay(input.date),
            source: input.source,
          },
        },
        create: {
          baseCurrency: input.baseCurrency,
          quoteCurrency: input.quoteCurrency,
          rate: input.rate,
          date: dateFromDay(input.date),
          source: input.source,
        },
        update: { rate: input.rate },
      });

      return mapExchangeRate(rate);
    },
  };
}

type ExchangeRateRow = {
  baseCurrency: Currency;
  quoteCurrency: Currency;
  rate: { toNumber(): number };
  source: string;
  date: Date;
};

function mapExchangeRate(row: ExchangeRateRow): ExchangeRateRecord {
  return {
    baseCurrency: row.baseCurrency,
    quoteCurrency: row.quoteCurrency,
    rate: row.rate.toNumber(),
    source: row.source,
    date: dayFromDate(row.date),
  };
}

function dateFromDay(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

function dayFromDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
