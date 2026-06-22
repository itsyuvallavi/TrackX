// Owner: packages/api-core. Exchange-rate lookup and conversion helpers.
import type { Currency } from "@trackx/shared";

const SOURCE = "frankfurter";
const API_BASE_URL = "https://api.frankfurter.dev";

export type ExchangeRateRecord = {
  baseCurrency: Currency;
  quoteCurrency: Currency;
  rate: number;
  source: string;
  date: string;
};

export type ExchangeRateRepository = {
  find(input: {
    baseCurrency: Currency;
    quoteCurrency: Currency;
    date: string;
    source: string;
  }): Promise<ExchangeRateRecord | null>;
  upsert(input: ExchangeRateRecord): Promise<ExchangeRateRecord>;
};

export type NormalizedAmounts = {
  amountEur: number | null;
  amountUsd: number | null;
};

export type ExchangeRateService = {
  normalize(input: {
    amount: number;
    currency: Currency;
    date: string;
  }): Promise<NormalizedAmounts>;
};

export class ExchangeRateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExchangeRateError";
  }
}

export function createExchangeRateService(
  repository: ExchangeRateRepository,
  fetchRate: typeof fetch = fetch,
): ExchangeRateService {
  async function rate(
    baseCurrency: Currency,
    quoteCurrency: Currency,
    date: string,
  ): Promise<number> {
    if (baseCurrency === quoteCurrency) {
      return 1;
    }

    const cached = await repository.find({
      baseCurrency,
      quoteCurrency,
      date,
      source: SOURCE,
    });

    if (cached) {
      return cached.rate;
    }

    const fetched = await fetchFrankfurterRate(
      fetchRate,
      baseCurrency,
      quoteCurrency,
    );

    await repository.upsert({
      baseCurrency,
      quoteCurrency,
      rate: fetched,
      source: SOURCE,
      date,
    });

    return fetched;
  }

  return {
    async normalize(input) {
      const amountEur =
        input.currency === "EUR"
          ? roundMoney(input.amount)
          : roundMoney(
              input.amount * (await rate(input.currency, "EUR", input.date)),
            );
      const amountUsd =
        input.currency === "USD" ? roundMoney(input.amount) : null;

      return { amountEur, amountUsd };
    },
  };
}

async function fetchFrankfurterRate(
  fetchRate: typeof fetch,
  baseCurrency: Currency,
  quoteCurrency: Currency,
): Promise<number> {
  const response = await fetchRate(
    `${API_BASE_URL}/v2/rate/${baseCurrency}/${quoteCurrency}`,
    { headers: { accept: "application/json" } },
  );

  if (!response.ok) {
    throw new ExchangeRateError(
      `Exchange rate lookup failed: ${response.status}.`,
    );
  }

  const body = (await response.json()) as { rate?: unknown };

  if (typeof body.rate !== "number" || !Number.isFinite(body.rate)) {
    throw new ExchangeRateError("Exchange rate response was invalid.");
  }

  return body.rate;
}

function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
