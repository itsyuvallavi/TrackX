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
      {
        headers: { accept: "application/json" },
        signal: expect.any(AbortSignal),
      },
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

  it("retries a transient provider failure before using the result", async () => {
    const records: ExchangeRateRecord[] = [];
    const fetchRate = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 520 }))
      .mockResolvedValueOnce(Response.json({ rate: 0.8752 })) as unknown as typeof fetch;
    const service = createExchangeRateService(repository(records), fetchRate);

    await expect(
      service.normalize({
        amount: 21.92,
        currency: "USD",
        date: "2026-07-20",
      }),
    ).resolves.toEqual({ amountEur: 19.18, amountUsd: 21.92 });

    expect(fetchRate).toHaveBeenCalledTimes(2);
    expect(records.at(-1)).toMatchObject({
      rate: 0.8752,
      date: "2026-07-20",
    });
  });

  it("uses a recent prior ECB rate when transient attempts fail", async () => {
    const records: ExchangeRateRecord[] = [
      {
        baseCurrency: "USD",
        quoteCurrency: "EUR",
        rate: 0.87489,
        source: "frankfurter-ecb",
        date: "2026-07-11",
      },
    ];
    const fetchRate = vi.fn(async () =>
      new Response(null, { status: 520 }),
    ) as unknown as typeof fetch;
    const service = createExchangeRateService(repository(records), fetchRate);

    await expect(
      service.normalize({
        amount: 21.92,
        currency: "USD",
        date: "2026-07-20",
      }),
    ).resolves.toEqual({ amountEur: 19.18, amountUsd: 21.92 });

    expect(fetchRate).toHaveBeenCalledTimes(2);
    expect(records).toHaveLength(1);
  });

  it("rejects a fallback rate older than fourteen days", async () => {
    const records: ExchangeRateRecord[] = [
      {
        baseCurrency: "USD",
        quoteCurrency: "EUR",
        rate: 0.87,
        source: "frankfurter-ecb",
        date: "2026-07-05",
      },
    ];
    const fetchRate = vi.fn(async () =>
      new Response(null, { status: 520 }),
    ) as unknown as typeof fetch;
    const service = createExchangeRateService(repository(records), fetchRate);

    await expect(
      service.normalize({
        amount: 21.92,
        currency: "USD",
        date: "2026-07-20",
      }),
    ).rejects.toThrow("Exchange rate lookup failed: 520.");
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
    async findLatest(input) {
      return (
        records
          .filter(
            (record) =>
              record.baseCurrency === input.baseCurrency &&
              record.quoteCurrency === input.quoteCurrency &&
              record.source === input.source &&
              record.date <= input.onOrBefore,
          )
          .sort((left, right) => right.date.localeCompare(left.date))[0] ?? null
      );
    },
    async upsert(input) {
      records.push(input);
      return input;
    },
  };
}
