# AGENTS.md

## Project

TrackX is planned as a Telegram-first AI expense tracker. The MVP should let a user send natural-language finance messages to a Telegram bot, parse those messages into structured transactions, store them, update weekly and monthly budgets, and show the same data in a web dashboard.

Working product name from the source plan: SpendPilot.

## Operating Rules

Every non-trivial implementation plan must follow this order:

1. Inspect current files, logs, docs, and behavior first.
2. Map current behavior against intended target behavior.
3. Plan the change, including files to edit or add.
4. Pre-mortem likely failures and mitigations.
5. Implement in small slices.
6. Test with focused checks and live CLI/TUI prompts when relevant.
7. Update docs.

Do not skip the inspection or behavior-map steps, even in a new repo. If the repo is empty, record that as an inspection finding.

## Architecture Direction

Use a TypeScript monorepo with small local services:

- `apps/web`: Next.js App Router dashboard.
- `apps/bot`: Telegram bot webhook service using Telegraf and Fastify.
- `services/api`: main Fastify API service.
- `services/parser`: parser service using OpenAI structured output plus deterministic fallback.
- `services/worker`: BullMQ worker for future summaries and reminders.
- `packages/db`: Prisma schema, migrations, seed data, and generated client.
- `packages/shared`: shared TypeScript types, Zod schemas, category rules, and budget helpers.
- `packages/config`: shared environment parsing.

Keep the services independently understandable, but keep local development simple through one workspace and one Docker Compose setup.

## Product Rules

- Telegram is the primary input surface for the MVP.
- The web app is the visual dashboard and editing surface.
- Support expenses and income.
- Support split messages, for example: `spent 50 eu on wipes (20eu) and new coffee maker (30eu)`.
- If a message is unclear, ask for clarification instead of guessing.
- If currency is missing, parser output must set `needsClarification=true`.
- Never hardcode secrets.
- Do not build bank integrations in the MVP.
- OpenAI is a must-have subscription and must not be suggested for cancellation.

## Category Rules

Default categories:

- Rent
- Utilities
- Groceries
- Restaurants / Cafes / Fun
- Transport
- Subscriptions / Tools
- Home
- Shopping
- Travel
- Income
- Misc

Important deterministic mappings:

- Bolt ride: Transport.
- Bolt Food, Uber Eats, Too Good To Go: Restaurants / Cafes / Fun.
- Maria Granel, Celeiro, Consigo, Pingo Doce, Auchan, Aldi, Continente: Groceries.
- Vodafone, EPAL, EDP: Utilities.
- IKEA and household essentials: Home.
- Flights: Travel.

## Default Budgets

Seed default budgets in EUR:

| Category                  | Monthly | Weekly |
| ------------------------- | ------: | -----: |
| Rent                      |    1000 |        |
| Utilities                 |      82 |        |
| Subscriptions / Tools     |     150 |        |
| Groceries                 |     260 |     65 |
| Restaurants / Cafes / Fun |     200 |     50 |
| Transport                 |      75 |     18 |
| Home                      |      75 |     18 |
| Misc                      |     100 |     25 |

## Implementation Standards

- Prefer shared Zod schemas at service boundaries.
- Keep parser output auditable by storing parse events.
- Keep deterministic parser tests useful even without `OPENAI_API_KEY`.
- Use Prisma migrations for schema changes.
- Keep secrets in environment variables and document them in `.env.example`.
- Add focused Vitest coverage for parser, category rules, and budget calculations.
- Update README and setup docs whenever local commands, env vars, or service boundaries change.

## Maintenance Rules

- Keep source files under 300 lines where practical.
- Split files by responsibility before they become multi-purpose.
- Add a short ownership header to every source file.
- Keep README files current when folders, commands, or ownership change.
- Keep active docs short; archive stale docs instead of deleting useful history.
- Implement in small slices.
- Before structural file changes, state which files will change.
- After each slice, run focused tests and update docs.
- Prefer typed boundaries and tests over implicit behavior.
- Treat logs/tests/runtime evidence as truth, not generated prose.
