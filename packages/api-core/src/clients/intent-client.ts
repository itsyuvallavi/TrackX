// Owner: packages/api-core. OpenAI client boundary for safe transaction edit intents.
import {
  CATEGORY_NAMES,
  TransactionIntentRequestSchema,
  TransactionIntentResponseSchema,
  type TransactionIntentRequest,
  type TransactionIntentResponse,
} from "@trackx/shared";

export class TransactionIntentClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransactionIntentClientError";
  }
}

export type TransactionIntentClient = {
  classify(input: TransactionIntentRequest): Promise<TransactionIntentResponse>;
};

export type OpenAiIntentClientConfig = {
  apiKey: string;
  model: string;
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

export function createNoopTransactionIntentClient(): TransactionIntentClient {
  return {
    async classify() {
      return {
        action: "create_transaction",
        transactionId: null,
        category: null,
        clarifyingQuestion: null,
        confidence: 1,
        reason: "AI edit intent is disabled.",
        parser: "deterministic",
      };
    },
  };
}

export function createOpenAiTransactionIntentClient(
  config: OpenAiIntentClientConfig,
): TransactionIntentClient {
  return {
    async classify(input) {
      const request = TransactionIntentRequestSchema.parse(input);
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0,
          input: [
            { role: "system", content: buildIntentInstructions() },
            { role: "user", content: JSON.stringify(request) },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "trackx_transaction_intent",
              strict: true,
              schema: TRANSACTION_INTENT_JSON_SCHEMA,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new TransactionIntentClientError(
          `OpenAI intent request returned ${response.status}.`,
        );
      }

      return TransactionIntentResponseSchema.parse(
        JSON.parse(
          readOpenAiOutputText((await response.json()) as OpenAiResponse),
        ),
      );
    },
  };
}

function buildIntentInstructions(): string {
  return [
    "You classify TrackX finance chat messages.",
    "Use parser=openai for every response.",
    "Return create_transaction when the user is logging a new expense or income.",
    "Return update_transaction_category only when the user clearly asks to move an existing recent transaction to a different category.",
    "Only use transactionId values from recentTransactions.",
    "Only use categories from the provided schema enum.",
    "Do not edit amount, currency, date, description, delete records, or create multiple actions.",
    "If the target transaction or target category is unclear, return clarify with one short question.",
    "If the user asks for an unsupported edit, return unsupported.",
  ].join(" ");
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

  throw new TransactionIntentClientError(
    "OpenAI intent response did not include output text.",
  );
}

const TRANSACTION_INTENT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "action",
    "transactionId",
    "category",
    "clarifyingQuestion",
    "confidence",
    "reason",
    "parser",
  ],
  properties: {
    action: {
      type: "string",
      enum: [
        "create_transaction",
        "update_transaction_category",
        "clarify",
        "unsupported",
      ],
    },
    transactionId: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
    category: {
      anyOf: [{ type: "string", enum: [...CATEGORY_NAMES] }, { type: "null" }],
    },
    clarifyingQuestion: {
      anyOf: [{ type: "string", minLength: 1 }, { type: "null" }],
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    reason: { type: "string", minLength: 1 },
    parser: { type: "string", enum: ["openai"] },
  },
} as const;
