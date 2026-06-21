// Owner: packages/parser-core. Manual OpenAI eval runner for parser dogfooding.
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { loadParserConfig } from "@trackx/config";
import type { ParserResponse, ParsedTransaction } from "@trackx/shared";
import { createOpenAiParser } from "../openai-parser.js";
import { EVAL_CASES } from "./cases.js";
import type { EvalCase } from "./case-types.js";
import { NEW_EVAL_CASES } from "./new-cases.js";

type EvalSuiteName = "baseline" | "new";

type EvalResult = {
  evalCase: EvalCase;
  passed: boolean;
  reasons: string[];
  response?: ParserResponse;
  error?: string;
};

loadDotenv({ path: resolve(process.cwd(), ".env") });
loadDotenv({ path: resolve(process.cwd(), "../../.env") });

const args = new Set(process.argv.slice(2));
const strict = args.has("--strict");
const limit = readLimit(process.argv.slice(2));
const suiteName = readSuite(process.argv.slice(2));
const config = loadParserConfig();

if (!config.openAiApiKey) {
  throw new Error("OPENAI_API_KEY is required for parser live eval.");
}

const parser = createOpenAiParser({
  apiKey: config.openAiApiKey,
  model: config.openAiModel,
});

const suiteCases = suiteName === "baseline" ? EVAL_CASES : NEW_EVAL_CASES;
const cases = suiteCases.slice(0, limit ?? suiteCases.length);
const results: EvalResult[] = [];

for (const evalCase of cases) {
  results.push(await runCase(evalCase));
}

printSummary(results, config.openAiModel, suiteName);

if (strict && results.some((result) => !result.passed)) {
  process.exitCode = 1;
}

async function runCase(evalCase: EvalCase): Promise<EvalResult> {
  try {
    const response = await parser({
      message: evalCase.message,
      timezone: config.defaultTimezone,
    });
    const reasons = checkResponse(evalCase, response);

    return { evalCase, response, passed: reasons.length === 0, reasons };
  } catch (error) {
    return {
      evalCase,
      passed: false,
      reasons: ["parser threw"],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function checkResponse(evalCase: EvalCase, response: ParserResponse): string[] {
  const expected = evalCase.expected;
  const reasons: string[] = [];

  if ("clarification" in expected && expected.clarification) {
    if (!response.needsClarification) reasons.push("expected clarification");
    if (response.transactions.length !== 0)
      reasons.push("expected no transactions");
    return reasons;
  }

  if (response.needsClarification) reasons.push("unexpected clarification");
  if (response.transactions.length !== expected.count) {
    reasons.push(
      `expected ${expected.count} transaction(s), got ${response.transactions.length}`,
    );
  }

  if (expected.type) {
    expectAll(
      response.transactions,
      (transaction) => transaction.type === expected.type,
      `type ${expected.type}`,
      reasons,
    );
  }

  if (expected.currency) {
    expectAll(
      response.transactions,
      (transaction) => transaction.currency === expected.currency,
      `currency ${expected.currency}`,
      reasons,
    );
  }

  if (
    expected.category &&
    response.transactions[0]?.category !== expected.category
  ) {
    reasons.push(
      `expected category ${expected.category}, got ${response.transactions[0]?.category ?? "none"}`,
    );
  }

  if (expected.amounts) {
    const actual = response.transactions.map(
      (transaction) => transaction.amount,
    );
    if (!sameAmounts(actual, expected.amounts)) {
      reasons.push(
        `expected amounts ${expected.amounts.join(", ")}, got ${actual.join(", ")}`,
      );
    }
  }

  return reasons;
}

function expectAll(
  transactions: ParsedTransaction[],
  predicate: (transaction: ParsedTransaction) => boolean,
  label: string,
  reasons: string[],
): void {
  if (!transactions.every(predicate)) {
    reasons.push(`expected all transactions to have ${label}`);
  }
}

function sameAmounts(actual: number[], expected: number[]): boolean {
  if (actual.length !== expected.length) return false;

  const sortedActual = [...actual].sort((a, b) => a - b);
  const sortedExpected = [...expected].sort((a, b) => a - b);

  return sortedExpected.every(
    (amount, index) => Math.abs(amount - sortedActual[index]!) < 0.001,
  );
}

function readLimit(args: string[]): number | null {
  const limitArg = args.find((arg) => arg.startsWith("--limit="));
  if (!limitArg) return null;

  const value = Number(limitArg.slice("--limit=".length));
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("--limit must be a positive integer.");
  }

  return value;
}

function readSuite(args: string[]): EvalSuiteName {
  const suiteArg = args.find((arg) => arg.startsWith("--suite="));
  if (!suiteArg) return "baseline";

  const suiteName = suiteArg.slice("--suite=".length);
  if (suiteName !== "baseline" && suiteName !== "new") {
    throw new Error("--suite must be baseline or new.");
  }

  return suiteName;
}

function printSummary(
  results: EvalResult[],
  model: string,
  suiteName: EvalSuiteName,
): void {
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;
  const rate = Math.round((passed / results.length) * 100);

  console.log(`Parser live eval model=${model}`);
  console.log(`Suite: ${suiteName}`);
  console.log(`Cases: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Pass rate: ${rate}%`);

  for (const result of results.filter((item) => !item.passed)) {
    console.log("");
    console.log(`[FAIL ${result.evalCase.id}] ${result.evalCase.message}`);
    console.log(`Reasons: ${result.reasons.join("; ")}`);
    if (result.error) console.log(`Error: ${result.error}`);
    if (result.response) {
      console.log(JSON.stringify(result.response, null, 2));
    }
  }
}
