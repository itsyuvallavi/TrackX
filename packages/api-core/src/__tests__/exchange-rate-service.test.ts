// Owner: packages/api-core. Exchange-rate conversion service tests.
import { describe, expect, it, vi } from "vitest";
import {
  createExchangeRateService,
  type ExchangeRateRecord,
  type ExchangeRateRepository,
} from "../services/exchange-rate-service.js";

describe("exchange-rate service", () => {
  it("converts non-EUR amounts to EUR and caches the rate", async () => {
    const records: ExchangeRateRecord[] = [];
    const fetchRate = vi.fn(async () =>
      Response.json({ rate: 0.86 }),
    ) as unknown as typeof fetch;
    const service = createExchangeRateService(repository(records), fetchRate);

    await expect(
      service.normalize({
        amount: 6.28,
        currency: "USD",
        date: "2026-06-22",
      }),
    ).resolves.toEqual({ amountEur: 5.4, amountUsd: 6.28 });

    await service.normalize({
      amount: 2,
      currency: "USD",
      date: "2026-06-22",
    });

    expect(fetchRate).toHaveBeenCalledTimes(1);
    expect(fetchRate).toHaveBeenCalledWith(
      "https://api.frankfurter.dev/v2/rate/USD/EUR?date=2026-06-22&providers=ECB",
      { headers: { accept: "application/json" } },
    );
    expect(records).toMatchObject([
      {
        baseCurrency: "USD",
        quoteCurrency: "EUR",
        rate: 0.86,
        source: "frankfurter-ecb",
        date: "2026-06-22",
      },
    ]);
  });

  it("keeps EUR amounts normalized without an external lookup", async () => {
    const fetchRate = vi.fn() as unknown as typeof fetch;
    const service = createExchangeRateService(repository([]), fetchRate);

    await expect(
      service.normalize({
        amount: 15,
        currency: "EUR",
        date: "2026-06-22",
      }),
    ).resolves.toEqual({ amountEur: 15, amountUsd: null });

    expect(fetchRate).not.toHaveBeenCalled();
  });
});

function repository(records: ExchangeRateRecord[]): ExchangeRateRepository {
  return {
    async find(input) {
      return (
        records.find(
          (record) =>
            record.baseCurrency === input.baseCurrency &&
            record.quoteCurrency === input.quoteCurrency &&
            record.date === input.date &&
            record.source === input.source,
        ) ?? null
      );
    },
    async upsert(input) {
      records.push(input);
      return input;
    },
  };
}
