// Owner: packages/api-core. Exchange-rate lookup and conversion helpers.
import type { Currency } from "@trackx/shared";

const SOURCE = "frankfurter-ecb";
const API_BASE_URL = "https://api.frankfurter.dev";
const FETCH_ATTEMPTS = 2;
const FETCH_TIMEOUT_MS = 4_000;
const MAX_FALLBACK_AGE_DAYS = 14;

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
  findLatest(input: {
    baseCurrency: Currency;
    quoteCurrency: Currency;
    onOrBefore: string;
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
  constructor(
    message: string,
    readonly retryable = false,
  ) {
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

    let fetched: number;

    try {
      fetched = await fetchFrankfurterRateWithRetry(
        fetchRate,
        baseCurrency,
        quoteCurrency,
        date,
      );
    } catch (error) {
      if (!(error instanceof ExchangeRateError) || !error.retryable) {
        throw error;
      }

      const fallback = await repository.findLatest({
        baseCurrency,
        quoteCurrency,
        onOrBefore: date,
        source: SOURCE,
      });

      if (fallback && isRecentEnough(fallback.date, date)) {
        return fallback.rate;
      }

      throw error;
    }

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

async function fetchFrankfurterRateWithRetry(
  fetchRate: typeof fetch,
  baseCurrency: Currency,
  quoteCurrency: Currency,
  date: string,
): Promise<number> {
  let lastError: ExchangeRateError | null = null;

  for (let attempt = 1; attempt <= FETCH_ATTEMPTS; attempt += 1) {
    try {
      return await fetchFrankfurterRate(
        fetchRate,
        baseCurrency,
        quoteCurrency,
        date,
      );
    } catch (error) {
      const normalized = normalizeFetchError(error);
      lastError = normalized;

      if (!normalized.retryable || attempt === FETCH_ATTEMPTS) {
        throw normalized;
      }
    }
  }

  throw lastError ?? new ExchangeRateError("Exchange rate lookup failed.", true);
}

async function fetchFrankfurterRate(
  fetchRate: typeof fetch,
  baseCurrency: Currency,
  quoteCurrency: Currency,
  date: string,
): Promise<number> {
  const params = new URLSearchParams({
    date,
    providers: "ECB",
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let response: Response;

  try {
    response = await fetchRate(
      `${API_BASE_URL}/v2/rate/${baseCurrency}/${quoteCurrency}?${params}`,
      {
        headers: { accept: "application/json" },
        signal: controller.signal,
      },
    );
  } catch (error) {
    throw normalizeFetchError(error);
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new ExchangeRateError(
      `Exchange rate lookup failed: ${response.status}.`,
      response.status === 429 || response.status >= 500,
    );
  }

  const body = (await response.json()) as { rate?: unknown };

  if (typeof body.rate !== "number" || !Number.isFinite(body.rate)) {
    throw new ExchangeRateError("Exchange rate response was invalid.", true);
  }

  return body.rate;
}

function normalizeFetchError(error: unknown): ExchangeRateError {
  if (error instanceof ExchangeRateError) {
    return error;
  }

  return new ExchangeRateError("Exchange rate lookup failed.", true);
}

function isRecentEnough(rateDate: string, requestedDate: string): boolean {
  const ageMs = Date.parse(`${requestedDate}T00:00:00.000Z`) -
    Date.parse(`${rateDate}T00:00:00.000Z`);
  const ageDays = ageMs / 86_400_000;

  return ageDays >= 0 && ageDays <= MAX_FALLBACK_AGE_DAYS;
}

function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}
