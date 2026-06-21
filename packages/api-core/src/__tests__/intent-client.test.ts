// Owner: packages/api-core. Smoke tests for route-independent intent clients.
import { describe, expect, it } from "vitest";

import { createNoopTransactionIntentClient } from "../clients/intent-client.js";

describe("createNoopTransactionIntentClient", () => {
  it("keeps transaction creation routed to the parser", async () => {
    const client = createNoopTransactionIntentClient();

    const result = await client.classify({
      message: "spent 15 eur on food",
      userId: "00000000-0000-4000-8000-000000000001",
      recentTransactions: [],
    });

    expect(result).toMatchObject({
      action: "create_transaction",
      parser: "deterministic",
      confidence: 1,
    });
  });
});
