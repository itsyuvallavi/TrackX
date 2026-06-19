// Owner: services/parser. Validation and normalization for OpenAI parser output.
import { ParserResponseSchema, type ParserResponse } from "@trackx/shared";

export class ParserOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParserOutputError";
  }
}

export function normalizeParserOutput(output: unknown): ParserResponse {
  const parsed = ParserResponseSchema.safeParse(output);

  if (!parsed.success) {
    throw new ParserOutputError(parsed.error.message);
  }

  const response = parsed.data;

  if (response.needsClarification && response.transactions.length > 0) {
    throw new ParserOutputError(
      "Clarification responses must not include transactions.",
    );
  }

  if (!response.needsClarification && response.transactions.length === 0) {
    throw new ParserOutputError(
      "Successful parser responses must include transactions.",
    );
  }

  if (response.needsClarification && response.clarifyingQuestion === null) {
    throw new ParserOutputError(
      "Clarification responses must include a clarifying question.",
    );
  }

  return response;
}

export function parseJsonOutput(outputText: string): unknown {
  try {
    return JSON.parse(outputText) as unknown;
  } catch (error) {
    throw new ParserOutputError(
      error instanceof Error ? error.message : "OpenAI response was not JSON.",
    );
  }
}
