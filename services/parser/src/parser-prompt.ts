// Owner: services/parser. Prompt instructions for OpenAI finance message extraction.
import { CATEGORY_NAMES, CURRENCIES } from "@trackx/shared";

export const PARSER_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "confidence",
    "transactions",
    "needsClarification",
    "clarifyingQuestion",
    "parser",
  ],
  properties: {
    confidence: { type: "number", minimum: 0, maximum: 1 },
    transactions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "amount",
          "currency",
          "type",
          "category",
          "description",
          "merchant",
          "confidence",
        ],
        properties: {
          amount: { type: "number", exclusiveMinimum: 0 },
          currency: { type: "string", enum: [...CURRENCIES] },
          type: { type: "string", enum: ["expense", "income"] },
          category: { type: "string", enum: [...CATEGORY_NAMES] },
          description: { type: "string", minLength: 1 },
          merchant: {
            anyOf: [{ type: "string", minLength: 1 }, { type: "null" }],
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
    needsClarification: { type: "boolean" },
    clarifyingQuestion: {
      anyOf: [{ type: "string", minLength: 1 }, { type: "null" }],
    },
    parser: { type: "string", enum: ["openai"] },
  },
} as const;

export function buildParserInstructions(): string {
  return [
    "You extract structured finance transactions for TrackX.",
    "Return only data that matches the provided JSON schema.",
    "Use parser=openai for every response.",
    `Allowed currencies: ${CURRENCIES.join(", ")}.`,
    "Normalize currency words and symbols before returning them: eur, eu, euro, euros, and € mean EUR; usd, dollar, dollars, and $ mean USD; ils, shekel, shekels, nis, and ₪ mean ILS.",
    `Allowed categories: ${CATEGORY_NAMES.join(", ")}.`,
    "Support expenses and income.",
    "Support split expense messages when individual item amounts are provided.",
    "An amount can appear directly before a currency alias, for example 15 eur means amount 15 and currency EUR.",
    "If the message includes a currency alias, currency is not missing even when defaultCurrency is null.",
    "If currency is missing, set needsClarification=true and return no transactions.",
    "If amount is missing, set needsClarification=true and return no transactions.",
    "If a split message total conflicts with item amounts, ask for clarification.",
    "Do not invent missing transaction data.",
    "Map bus, metro, train, Carris, and Bolt ride to Transport.",
    "Map Bolt Food, Uber Eats, Too Good To Go, restaurants, cafes, and food to Restaurants / Cafes / Fun.",
    "Map Maria Granel, Celeiro, Consigo, Pingo Doce, Auchan, Aldi, and Continente to Groceries.",
    "Map Vodafone, EPAL, and EDP to Utilities.",
    "Map IKEA and household essentials to Home.",
    "Map flights, Ryanair, El Al, and hotels to Travel.",
    "Map income messages to Income.",
    "Example: spent 15 eur on food -> one EUR expense for 15 categorized as Restaurants / Cafes / Fun.",
    "Example: spent 2.3 euro on bus -> one EUR expense for 2.3 categorized as Transport.",
    "Example: earned 200 dollars -> one USD income categorized as Income.",
    "Example: spent 50 eu on wipes (20eu) and new coffee maker (30eu) -> two EUR expenses for 20 and 30.",
  ].join("\n");
}
