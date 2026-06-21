// Owner: packages/parser-core. OpenAI-backed finance message parser.
import OpenAI from "openai";
import type { ParserRequest, ParserResponse } from "@trackx/shared";
import {
  parseJsonOutput,
  normalizeParserOutput,
  ParserOutputError,
} from "./normalize-parser-output.js";
import {
  PARSER_RESPONSE_SCHEMA,
  buildParserInstructions,
} from "./parser-prompt.js";

export type OpenAiParserConfig = {
  apiKey: string;
  model: string;
};

export type OpenAiResponsesClient = {
  responses: {
    create(input: Record<string, unknown>): Promise<OpenAiResponse>;
  };
};

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

export type ParseTransactionMessage = (
  request: ParserRequest,
) => Promise<ParserResponse>;

export function createOpenAiClient(apiKey: string): OpenAiResponsesClient {
  return new OpenAI({ apiKey }) as unknown as OpenAiResponsesClient;
}

export function createOpenAiParser(
  config: OpenAiParserConfig,
  client: OpenAiResponsesClient = createOpenAiClient(config.apiKey),
): ParseTransactionMessage {
  return async (request) => parseTransactionWithOpenAi(request, config, client);
}

export async function parseTransactionWithOpenAi(
  request: ParserRequest,
  config: OpenAiParserConfig,
  client: OpenAiResponsesClient,
): Promise<ParserResponse> {
  const response = await client.responses.create({
    model: config.model,
    temperature: 0,
    input: [
      {
        role: "system",
        content: buildParserInstructions(),
      },
      {
        role: "user",
        content: JSON.stringify({
          message: request.message,
          defaultCurrency: request.defaultCurrency ?? null,
          timezone: request.timezone,
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "trackx_parser_response",
        strict: true,
        schema: PARSER_RESPONSE_SCHEMA,
      },
    },
  });

  return normalizeParserOutput(parseJsonOutput(readOpenAiOutputText(response)));
}

function readOpenAiOutputText(response: OpenAiResponse): string {
  if (typeof response.output_text === "string" && response.output_text !== "") {
    return response.output_text;
  }

  for (const item of response.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) {
        return content.text;
      }
    }
  }

  throw new ParserOutputError("OpenAI response did not include output text.");
}
