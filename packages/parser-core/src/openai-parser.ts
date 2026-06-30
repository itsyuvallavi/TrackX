// Owner: packages/parser-core. OpenAI-backed finance message parser.
import OpenAI from "openai";
import {
  matchCategory,
  type CategoryRuleMatch,
  type ParserRequest,
  type ParserResponse,
} from "@trackx/shared";
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
  const match = matchCategory(request.message);
  const parsed = await requestOpenAiParse(request, config, client, match);

  if (shouldRetryCategoryClarification(parsed, match)) {
    const repaired = await requestOpenAiParse(request, config, client, match);
    return applyDeterministicCategoryRules(repaired, match);
  }

  return applyDeterministicCategoryRules(parsed, match);
}

async function requestOpenAiParse(
  request: ParserRequest,
  config: OpenAiParserConfig,
  client: OpenAiResponsesClient,
  categoryHint?: CategoryRuleMatch,
): Promise<ParserResponse> {
  const response = await client.responses.create({
    model: config.model,
    temperature: 0,
    input: [
      {
        role: "system",
        content: buildParserInstructionsWithHint(categoryHint),
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

function buildParserInstructionsWithHint(
  categoryHint?: CategoryRuleMatch,
): string {
  if (!categoryHint || categoryHint.category === "Misc") {
    return buildParserInstructions();
  }

  return [
    buildParserInstructions(),
    `Deterministic TrackX category rule matched this message: ${categoryHint.category}.`,
    "Do not ask the user for category when this rule matched.",
    "Use this category for expense transactions unless the transaction is income.",
  ].join("\n");
}

function applyDeterministicCategoryRules(
  response: ParserResponse,
  match: CategoryRuleMatch,
): ParserResponse {
  if (response.needsClarification || match.category === "Misc") {
    return response;
  }

  return {
    ...response,
    transactions: response.transactions.map((transaction) =>
      transaction.type === "income"
        ? transaction
        : {
            ...transaction,
            category: match.category,
            confidence: Math.max(transaction.confidence, match.confidence),
          },
    ),
  };
}

function shouldRetryCategoryClarification(
  response: ParserResponse,
  match: CategoryRuleMatch,
): boolean {
  if (!response.needsClarification || match.category === "Misc") {
    return false;
  }

  return /categor|classif/i.test(response.clarifyingQuestion ?? "");
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
