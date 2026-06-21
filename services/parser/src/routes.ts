// Owner: services/parser. Fastify routes for parser service boundaries.
import type { FastifyInstance } from "fastify";
import {
  ParserRequestSchema,
  ParserResponseSchema,
  type ParserRequest,
} from "@trackx/shared";
import type { ParseTransactionMessage } from "@trackx/parser-core";

export type ParserRoutesOptions = {
  parseTransaction: ParseTransactionMessage | null;
};

export async function registerParserRoutes(
  server: FastifyInstance,
  options: ParserRoutesOptions,
): Promise<void> {
  server.get("/health", async () => ({ ok: true, service: "parser" }));

  server.post("/parse-transaction", async (request, reply) => {
    if (options.parseTransaction === null) {
      return reply.status(503).send({
        error: "Parser service requires OPENAI_API_KEY.",
      });
    }

    const parsed = ParserRequestSchema.safeParse(request.body);

    if (!parsed.success) {
      return reply.status(400).send({
        error: "Invalid parser request.",
        details: parsed.error.issues,
      });
    }

    const response = await options.parseTransaction(
      parsed.data as ParserRequest,
    );
    const parsedResponse = ParserResponseSchema.safeParse(response);

    if (!parsedResponse.success) {
      return reply.status(502).send({
        error: "Parser returned an invalid response.",
        details: parsedResponse.error.issues,
      });
    }

    return reply.status(200).send(parsedResponse.data);
  });
}
