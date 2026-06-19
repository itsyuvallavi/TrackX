// Owner: services/api. HTTP client boundary for the parser service.
import {
  ParserRequestSchema,
  ParserResponseSchema,
  type ParserRequest,
  type ParserResponse,
} from "@trackx/shared";

export class ParserClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParserClientError";
  }
}

export type ParserClient = {
  parseTransaction(input: ParserRequest): Promise<ParserResponse>;
};

export function createHttpParserClient(baseUrl: string): ParserClient {
  return {
    async parseTransaction(input) {
      const request = ParserRequestSchema.parse(input);
      const response = await fetch(`${baseUrl}/parse-transaction`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new ParserClientError(
          `Parser service returned ${response.status}.`,
        );
      }

      const json = (await response.json()) as unknown;
      return ParserResponseSchema.parse(json);
    },
  };
}
