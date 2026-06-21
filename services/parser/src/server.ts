// Owner: services/parser. Fastify server construction for the OpenAI parser service.
import Fastify, { type FastifyInstance } from "fastify";
import type { ParserConfig } from "@trackx/config";
import {
  createOpenAiParser,
  type ParseTransactionMessage,
} from "@trackx/parser-core";
import { registerParserRoutes } from "./routes.js";

export type BuildParserServerOptions = {
  config: ParserConfig;
  parseTransaction?: ParseTransactionMessage | null;
};

export async function buildParserServer(
  options: BuildParserServerOptions,
): Promise<FastifyInstance> {
  const server = Fastify({ logger: false });
  const parseTransaction =
    options.parseTransaction ??
    (options.config.openAiApiKey
      ? createOpenAiParser({
          apiKey: options.config.openAiApiKey,
          model: options.config.openAiModel,
        })
      : null);

  await registerParserRoutes(server, { parseTransaction });

  return server;
}
