// Owner: services/parser. Parser service runtime entrypoint.
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { loadParserConfig } from "@trackx/config";
import { buildParserServer } from "./server.js";

loadDotenv({ path: resolve(process.cwd(), "../../.env") });

const config = loadParserConfig();
const server = await buildParserServer({ config });

await server.listen({
  port: config.parserPort,
  host: "0.0.0.0",
});
