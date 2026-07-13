// Owner: apps/web. Apple Wallet import route lifecycle tests.
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  afterCallbacks: [] as Array<() => Promise<void> | void>,
  after: vi.fn<(callback: () => Promise<void> | void) => void>(),
  importAppleWallet: vi.fn(),
  record: vi.fn(),
}));

vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();

  return {
    ...actual,
    after: mocks.after,
  };
});

vi.mock("@/lib/api-route-runtime", () => ({
  getMessageEventService: () => ({ record: mocks.record }),
  getShortcutImportService: () => ({
    importAppleWallet: mocks.importAppleWallet,
  }),
}));

import { POST } from "./route";

describe("POST /api/imports/apple-wallet", () => {
  beforeEach(() => {
    mocks.afterCallbacks.length = 0;
    mocks.after.mockReset();
    mocks.after.mockImplementation((callback) => {
      mocks.afterCallbacks.push(callback);
    });
    mocks.importAppleWallet.mockReset();
    mocks.importAppleWallet.mockResolvedValue({ transactions: [{}] });
    mocks.record.mockReset();
    mocks.record.mockResolvedValue(undefined);
  });

  it("records receipt before scheduling background processing", async () => {
    let finishReceipt: (() => void) | undefined;
    mocks.record.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishReceipt = resolve;
        }),
    );

    const responsePromise = POST(walletRequest());

    await vi.waitFor(() => expect(mocks.record).toHaveBeenCalledOnce());
    expect(mocks.record.mock.calls[0]?.[0]).toMatchObject({
      eventType: "apple_wallet_import_received",
      source: "api",
    });
    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.importAppleWallet).not.toHaveBeenCalled();

    finishReceipt?.();
    const response = await responsePromise;

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toMatchObject({ accepted: true });
    expect(mocks.after).toHaveBeenCalledOnce();
    expect(mocks.afterCallbacks).toHaveLength(1);

    await mocks.afterCallbacks[0]?.();

    expect(mocks.importAppleWallet).toHaveBeenCalledOnce();
    expect(mocks.record.mock.calls[1]?.[0]).toMatchObject({
      eventType: "apple_wallet_import_completed",
      source: "api",
    });
  });

  it("records a background failure after accepting the request", async () => {
    mocks.importAppleWallet.mockRejectedValueOnce(new Error("import failed"));

    const response = await POST(walletRequest());

    expect(response.status).toBe(202);
    await mocks.afterCallbacks[0]?.();

    expect(mocks.record.mock.calls.map(([event]) => event.eventType)).toEqual([
      "apple_wallet_import_received",
      "apple_wallet_import_failed",
    ]);
    expect(mocks.record.mock.calls[1]?.[0]).toMatchObject({ status: "failed" });
  });
});

function walletRequest(): Request {
  return new Request("http://localhost:3000/api/imports/apple-wallet", {
    method: "POST",
    headers: {
      authorization: "Bearer txs_test",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      source: "apple_wallet",
      merchant: "Test Merchant",
      amount: "3.50 EUR",
    }),
  });
}
