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

  it("defines terse message and default type rules", () => {
    const instructions = buildParserInstructions();

    expect(instructions).toContain("Terse Telegram-style messages");
    expect(instructions).toContain("Do not ask for clarification only because");
    expect(instructions).toContain("Default to type=expense");
    expect(instructions).toContain(
      "amount, a supported currency, and a merchant or item",
    );
  });

  it("defines income and clarification boundaries", () => {
    const instructions = buildParserInstructions();

    expect(instructions).toContain("Income language includes");
    expect(instructions).toContain("For every type=income transaction");
    expect(instructions).toContain(
      "currency is not one of the allowed currencies",
    );
    expect(instructions).toContain("only contains amount and currency");
    expect(instructions).toContain(
      "clarifyingQuestion must be a natural question",
    );
    expect(instructions).toContain("Do not use defaultCurrency");
    expect(instructions).toContain("use Misc");
    expect(instructions).toContain("A currency word without a number");
    expect(instructions).toContain("Merchant mapping has priority");
  });

  it("includes examples for dogfood failure modes", () => {
    const instructions = buildParserInstructions();

    expect(instructions).toContain("pingo doce 32 eur");
    expect(instructions).toContain("coffee 3.5 eur");
    expect(instructions).toContain("6.90 euro for a movie");
    expect(instructions).toContain("metro pass 40 eur");
    expect(instructions).toContain("€16 sushi");
    expect(instructions).toContain("refund from amazon 12 eur");
    expect(instructions).toContain("spent 45 nis on dinner");
    expect(instructions).toContain("cursor 20 usd");
    expect(instructions).toContain("celeiro vitamins 19 eur");
    expect(instructions).toContain("kitchen towels 9 eur");
    expect(instructions).toContain("amazon cable 11 eur");
    expect(instructions).toContain("milk 1.99 EUR");
    expect(instructions).toContain("cashback 3 eur");
    expect(instructions).toContain("book 14 eur");
    expect(instructions).toContain("sent 20 eur to friend");
    expect(instructions).toContain("spent 15 on food");
    expect(instructions).toContain("1.99 milk");
    expect(instructions).toContain("15 eur");
  });

  it("includes observed category mappings from live eval", () => {
    const instructions = buildParserInstructions();

    expect(instructions).toContain("Patreon");
    expect(instructions).toContain("laundry detergent");
    expect(instructions).toContain("headphones");
    expect(instructions).toContain("notebooks");
    expect(instructions).toContain("parking");
    expect(instructions).toContain("sent money to a friend");
    expect(instructions).toContain("tram");
    expect(instructions).toContain("phone plan");
    expect(instructions).toContain("Notion");
    expect(instructions).toContain("backpack");
    expect(instructions).toContain("passport photos");
    expect(instructions).toContain("paid someone back");
    expect(instructions).toContain("movies");
    expect(instructions).toContain("cinema");
  });

  it("includes examples for fresh eval failure modes", () => {
    const instructions = buildParserInstructions();

    expect(instructions).toContain("15 dollars coffee");
    expect(instructions).toContain("openai api 18 dollars");
    expect(instructions).toContain("notion 10 dollars");
    expect(instructions).toContain("internet 31 eur");
    expect(instructions).toContain("wifi router subscription 8 eur");
    expect(instructions).toContain("sent 25 eur to daniel");
    expect(instructions).toContain("paid maria back 30 eur");
  });

  it("defines split total matching behavior", () => {
    const instructions = buildParserInstructions();

    expect(instructions).toContain("compare the total to the sum");
    expect(instructions).toContain("If they match exactly");
    expect(instructions).toContain("do not ask for confirmation");
    expect(instructions).toContain("always set needsClarification=true");
    expect(instructions).toContain("transactions=[]");
    expect(instructions).toContain("Never ask to confirm");
    expect(instructions).toContain("20+30=50");
    expect(instructions).toContain("20+40 is not 50");
    expect(instructions).toContain("transaction amounts are [20, 30]");
  });
});
