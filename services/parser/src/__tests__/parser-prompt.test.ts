// Owner: services/parser. Tests for parser prompt contract details.
import { describe, expect, it } from "vitest";
import { buildParserInstructions } from "../parser-prompt.js";

describe("buildParserInstructions", () => {
  it("tells OpenAI to normalize common currency aliases", () => {
    const instructions = buildParserInstructions();

    expect(instructions).toContain("eur");
    expect(instructions).toContain("euro");
    expect(instructions).toContain("dollars");
    expect(instructions).toContain("shekels");
  });

  it("includes concrete examples for required parser behavior", () => {
    const instructions = buildParserInstructions();

    expect(instructions).toContain("spent 15 eur on food");
    expect(instructions).toContain("spent 2.3 euro on bus");
    expect(instructions).toContain("earned 200 dollars");
    expect(instructions).toContain("spent 50 eu on wipes");
  });
});
