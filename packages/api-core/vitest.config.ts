// Owner: packages/api-core. Vitest configuration for route-independent API logic.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
  },
});
