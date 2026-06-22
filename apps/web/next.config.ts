// Owner: apps/web. Next.js configuration for the TrackX dashboard.
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const dirname = path.dirname(fileURLToPath(import.meta.url));

process.loadEnvFile?.(path.join(dirname, "../..", ".env"));

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(dirname, "../.."),
  outputFileTracingIncludes: {
    "/*": [
      "../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*",
      "../../node_modules/.prisma/client/**/*",
      "../../node_modules/.pnpm/pg@*/node_modules/pg/**/*",
      "../../node_modules/.pnpm/@prisma+adapter-pg@*/node_modules/@prisma/adapter-pg/**/*",
    ],
  },
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
  transpilePackages: [
    "@trackx/api-core",
    "@trackx/db",
    "@trackx/parser-core",
    "@trackx/shared",
  ],
};

export default nextConfig;
