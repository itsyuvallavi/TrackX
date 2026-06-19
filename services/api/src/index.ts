// Owner: services/api. API service runtime entrypoint.
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { loadApiConfig } from "@trackx/config";
import { buildApiServer } from "./server.js";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });

const config = loadApiConfig();
const server = await buildApiServer({ config });

await server.listen({
  port: config.apiPort,
  host: "0.0.0.0",
});
