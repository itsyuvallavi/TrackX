// Owner: apps/web. Server-side OpenAI route for editable budget split suggestions.
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  BudgetPeriodSchema,
  CATEGORY_NAMES,
  CurrencySchema,
  type CategoryName,
} from "@trackx/shared";
import { requireApiUserId } from "@/lib/api-route-auth";
import {
  ApiRouteBadRequestError,
  readJsonBody,
  toApiErrorResponse,
} from "@/lib/api-route-errors";

export const dynamic = "force-dynamic";

const EXPENSE_CATEGORIES = CATEGORY_NAMES.filter(
  (category) => category !== "Income",
) as Exclude<CategoryName, "Income">[];

const BudgetSuggestRequestSchema = z.object({
  message: z.string().trim().min(8).max(800),
  period: BudgetPeriodSchema.default("month"),
  currency: CurrencySchema.default("EUR"),
  currentBudgets: z
    .array(
      z.object({
        category: z.enum(CATEGORY_NAMES),
        limitAmount: z.number().nonnegative(),
      }),
    )
    .max(20)
    .default([]),
});

const BudgetSuggestionSchema = z.object({
  category: z.enum(CATEGORY_NAMES).refine((category) => category !== "Income"),
  limitAmount: z.number().nonnegative(),
  reason: z.string().min(1).max(160),
});

const BudgetSuggestResponseSchema = z.object({
  period: BudgetPeriodSchema,
  currency: CurrencySchema,
  budgets: z.array(BudgetSuggestionSchema).min(1).max(20),
  notes: z.array(z.string().min(1).max(160)).max(4),
});

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  }>;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    await requireApiUserId();
    const input = BudgetSuggestRequestSchema.parse(await readJsonBody(request));
    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      throw new ApiRouteBadRequestError("Budget AI requires OPENAI_API_KEY.");
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0,
        input: [
          { role: "system", content: budgetInstructions() },
          { role: "user", content: JSON.stringify(input) },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "trackx_budget_suggestion",
            strict: true,
            schema: BUDGET_SUGGESTION_JSON_SCHEMA,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new ApiRouteBadRequestError(
        `Budget AI request returned ${response.status}.`,
      );
    }

    const body = BudgetSuggestResponseSchema.parse(
      JSON.parse(
        readOpenAiOutputText((await response.json()) as OpenAiResponse),
      ),
    );

    return NextResponse.json(body);
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

function budgetInstructions(): string {
  return [
    "You help TrackX users split a budget into editable category limits.",
    "Only use the provided category enum. Never include Income.",
    "Respect explicit user instructions first, then use currentBudgets as context.",
    "If the user gives one total amount, split it across practical personal finance categories.",
    "Use zero for categories the user clearly wants disabled.",
    "Return concise reasons. Do not include advice outside the JSON schema.",
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

  throw new ApiRouteBadRequestError(
    "Budget AI response did not include output text.",
  );
}

const BUDGET_SUGGESTION_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["period", "currency", "budgets", "notes"],
  properties: {
    period: { type: "string", enum: ["week", "month"] },
    currency: { type: "string", enum: ["EUR", "USD", "ILS"] },
    budgets: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "limitAmount", "reason"],
        properties: {
          category: { type: "string", enum: EXPENSE_CATEGORIES },
          limitAmount: { type: "number", minimum: 0 },
          reason: { type: "string", minLength: 1, maxLength: 160 },
        },
      },
    },
    notes: {
      type: "array",
      maxItems: 4,
      items: { type: "string", minLength: 1, maxLength: 160 },
    },
  },
} as const;
