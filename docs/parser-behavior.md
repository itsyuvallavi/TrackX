# Parser Behavior

This document tracks the active parser and category behavior. Keep it short and current as parser rules change.

## Current Slice

The parser service uses OpenAI structured output as the primary parser and validates responses with shared Zod schemas.

Deterministic category rules in `@trackx/shared` remain useful as prompt guidance and regression tests, but they are not a separate fallback parser service.

The OpenAI call uses deterministic temperature for lower eval variance.

## Category Rule Order

Rules are applied from most specific to most generic. This prevents broad words such as `food` from overriding merchants with special meanings.

1. Food delivery merchants: Bolt Food, Uber Eats, Too Good To Go.
2. Transport merchants and routes: Bolt ride, metro, bus, train, Carris.
3. Grocery merchants: Maria Granel, Celeiro, Consigo, Pingo Doce, Auchan, Aldi, Continente.
4. Utilities: Vodafone, EPAL, EDP.
5. Subscriptions and tools: OpenAI, Cursor, YouTube, Patreon, HBO, Oura.
6. Home: IKEA, kitchen, cleaning, furniture, towels, bedding.
7. Travel: flight, Ryanair, El Al, hotel.
8. Shopping: Amazon, Zara, electronics, clothes.
9. Generic restaurant/cafe/fun wording: cafe, coffee, dinner, drinks, food, movie, cinema.
10. Fallback: Misc.

## Required Examples

| Message                  | Category                  |
| ------------------------ | ------------------------- |
| `bolt ride 7 eur`        | Transport                 |
| `bolt food 14 eur`       | Restaurants / Cafes / Fun |
| `6.90 euro for a movie`  | Restaurants / Cafes / Fun |
| `pingo doce 32 eur`      | Groceries                 |
| `vodafone 82 eur`        | Utilities                 |
| `ikea shelf 35 eur`      | Home                      |
| `ryanair flight 200 eur` | Travel                    |

## Clarification Policy

The parser service must ask for clarification instead of guessing when required transaction data is unclear. Missing currency or missing amount must produce `needsClarification=true` and no transactions.

Terse Telegram-style messages are valid when they include enough information. Amount + supported currency + merchant/item should create a transaction. The parser must not use `defaultCurrency` to fill a missing currency.

## Required Parser Examples

| Message                                                   | Expected result               |
| --------------------------------------------------------- | ----------------------------- |
| `spent 15 eur on food`                                    | One expense                   |
| `spent 2.3 euro on bus`                                   | One Transport expense         |
| `earned 200 dollars`                                      | One Income transaction in USD |
| `spent 50 eu on wipes (20eu) and new coffee maker (30eu)` | Two expense transactions      |

## Local Behavior

`GET /health` does not require an OpenAI key. `POST /parse-transaction` requires `OPENAI_API_KEY`; without it, the service returns an unavailable response instead of pretending to parse.

## Live Parser Eval

Use the manual dogfood eval before changing parser prompts or trusting a new model:

```bash
pnpm parser:eval
pnpm parser:eval -- --suite=new
```

The eval calls the real OpenAI parser with 100 realistic messages and checks product-critical fields: clarification behavior, transaction count, type, currency, category, and amounts. The default suite is the baseline dogfood set. Use `--suite=new` for a fresh anti-overfit set. It is intentionally not part of default CI because it uses a paid live model and can vary over time.

To make failures exit non-zero:

```bash
pnpm parser:eval -- --strict
```

Baseline dogfood run on `gpt-4o-mini` before prompt hardening:

- Date: 2026-06-19.
- Cases: 100.
- Passed: 37.
- Failed: 63.
- Main failure mode: over-clarification. The model often asked for amount, currency, type, or category even when the message already contained enough information, especially for terse messages without an explicit verb such as `spent`.
- Other observed failure: one refund was parsed as `type=income` but `category=Misc` instead of `Income`.

Baseline-suite dogfood run on `gpt-4o-mini` after prompt hardening:

- Date: 2026-06-19.
- Cases: 100.
- Passed: 94.
- Failed: 6.
- Pass rate: 94%.

Known baseline-suite failures at that gate:

- `celeiro vitamins 19 eur` parsed as `Misc` instead of `Groceries`.
- Conflicting split total `spent 50 eur on wipes (20eur) and coffee maker (40eur)` parsed transactions instead of asking clarification.
- `1.99 milk` used EUR even though currency is missing.
- `cashback 3 eur`, `book 14 eur`, and `sent 20 eur to friend` still over-clarified.

Fresh anti-overfit suite after the follow-up hardening pass:

- Date: 2026-06-19.
- Cases: 100.
- Passed: 96.
- Failed: 4.
- Pass rate: 96%.

Remaining known fresh-suite failures:

- `notebook and pen 4 eur` parsed as `Misc` instead of `Shopping`.
- `shoes sale 72 eur` parsed as income because `sale` was interpreted as money received.
- `splitwise received 11 eur` over-clarified instead of creating Income.
- `sent 25 eur to daniel` over-clarified instead of creating Misc expense.

The parser is strong enough for MVP dogfooding, but parser behavior is not yet production-stable. Keep using the live eval before prompt/model changes.
