# Parser Behavior

This document tracks the active deterministic parser and category behavior. Keep it short and current as parser rules change.

## Current Slice

The parser service uses OpenAI structured output as the primary parser and validates responses with shared Zod schemas.

Deterministic category rules in `@trackx/shared` remain useful as prompt guidance and regression tests, but they are not a separate fallback parser service.

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
9. Generic restaurant/cafe wording.
10. Fallback: Misc.

## Required Examples

| Message                  | Category                  |
| ------------------------ | ------------------------- |
| `bolt ride 7 eur`        | Transport                 |
| `bolt food 14 eur`       | Restaurants / Cafes / Fun |
| `pingo doce 32 eur`      | Groceries                 |
| `vodafone 82 eur`        | Utilities                 |
| `ikea shelf 35 eur`      | Home                      |
| `ryanair flight 200 eur` | Travel                    |

## Clarification Policy

The parser service must ask for clarification instead of guessing when required transaction data is unclear. Missing currency or missing amount must produce `needsClarification=true` and no transactions.

## Required Parser Examples

| Message                                                   | Expected result               |
| --------------------------------------------------------- | ----------------------------- |
| `spent 15 eur on food`                                    | One expense                   |
| `spent 2.3 euro on bus`                                   | One Transport expense         |
| `earned 200 dollars`                                      | One Income transaction in USD |
| `spent 50 eu on wipes (20eu) and new coffee maker (30eu)` | Two expense transactions      |

## Local Behavior

`GET /health` does not require an OpenAI key. `POST /parse-transaction` requires `OPENAI_API_KEY`; without it, the service returns an unavailable response instead of pretending to parse.
