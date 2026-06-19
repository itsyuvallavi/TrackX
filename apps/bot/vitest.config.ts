// Owner: apps/bot. Vitest config for Telegram bot unit tests.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: false,
    environment: "node",
  },
});
