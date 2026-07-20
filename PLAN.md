# TrackX Detailed Implementation Plan

Status: Production foundations are live. Vercel serves the authenticated Next.js app and same-origin API, Neon stores production data and audit events, Neon Auth owns web sessions, and Cloudflare receives Telegram webhooks. Better Stack is the sanitized central operational view, while Neon `message_events` remains the durable audit source. The previous Supabase project is retained only as a paused rollback snapshot after the July 2026 migration.

The original slice narrative below is retained as implementation history. Current production commands, ownership, environment variables, and verification procedures live in `README.md` and `docs/platform-stack.md`.

Slice 1 created the root monorepo scaffold. Slice 2 added the shared package foundation. Slice 3 added centralized environment config parsing. Slice 4 added the Prisma database package, initial migration, and default seed data. Slice 5 added the OpenAI-backed parser service. Slice 6 added the API service base and manual transaction CRUD routes. Slice 6.5 added local Docker Compose support for running Postgres, Redis, parser, and API together. Slice 7 added read-only budget status and dashboard summary endpoints. Slice 8 added the API from-message flow that calls the parser, stores parse events, and creates transactions. Slice 9 added the Telegram bot service with allowlist access control and API-backed commands. Slice 10 added the Next.js web dashboard with API-backed summaries, budgets, and transaction edit/delete. Slice 11 added the BullMQ worker placeholder with Redis connection and disabled-by-default schedules for local learning only. Slice 12 added architecture docs, fresh-install guidance, troubleshooting, and MVP verification checks. Production-prep slices then added serverless-compatible Prisma URL handling, extracted `@trackx/api-core`, added same-origin Next.js Route Handlers under `apps/web/src/app/api`, and extracted `@trackx/parser-core` so Vercel can parse in-process. The local MVP gate is complete. Production uses Vercel Route Handlers in `apps/web`, Neon Postgres and Neon Auth, and Cloudflare Telegram webhooks; do not add production Redis/BullMQ unless a real queue requirement appears.

## 0. Planning Contract

This project will follow the repo guideline order for every non-trivial implementation slice:

1. Inspect current files, logs, docs, and behavior first.
2. Map current behavior against intended target behavior.
3. Plan the change, including files to edit or add.
4. Pre-mortem likely failures and mitigations.
5. Implement in small slices.
6. Test with focused checks and live CLI/TUI prompts when relevant.
7. Update docs.

For this repo, the plan must stay inspect-first even though the repo is currently empty. "Empty repo" is a real inspection finding, not permission to skip orientation.

Maintenance rules from `AGENTS.md` apply to every slice. In particular, source files should stay under 300 lines where practical, source files need a short ownership header, structural file changes must be stated before edits, and each slice must finish with focused tests plus docs updates.

## 1. Inspection Findings

### 1.1 Repository State

Observed repository path:

- `/Users/yuval/Documents/TrackX`

Observed files:

- `.git`
- `AGENTS.md`
- `PLAN.md`
- `.env.example`
- `.gitignore`
- `README.md`
- `docker-compose.yml`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `turbo.json`
- `docs/parser-behavior.md`
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/vitest.config.ts`
- `packages/shared/src/*`
- `packages/shared/src/__tests__/*`
- `packages/config/package.json`
- `packages/config/tsconfig.json`
- `packages/config/vitest.config.ts`
- `packages/config/src/*`
- `packages/config/src/__tests__/*`

Observed missing project assets:

- No app code
- No service code
- No database schema
- No logs
- No existing runtime behavior

Current git status:

- Root scaffold files are untracked.
- Shared package files are untracked.
- Config package files are untracked.
- No committed implementation code exists yet.

### 1.2 Source Briefs Reviewed

External planning inputs reviewed:

- `/Users/yuval/Downloads/codex_expense_platform_prompt.md`
- `/Users/yuval/Downloads/expense_platform_microservices_plan.md`

The two files agree on the core MVP:

- Telegram-first natural language expense logging.
- AI/parser service with deterministic fallback.
- Fastify API service.
- Next.js dashboard.
- Prisma/Postgres storage.
- Redis/BullMQ worker path.
- Shared TypeScript/Zod contracts.
- Local Docker Compose setup.
- Vitest tests.
- Documentation and env examples.

### 1.3 Product Constraints Extracted

The MVP must support:

- Natural-language expense messages.
- Natural-language income messages.
- Split transactions in one message.
- EUR, USD, and ILS.
- Weekly and monthly budgets.
- Telegram-friendly feedback after transaction logging.
- Undo last transaction.
- Manual dashboard editing and deleting.
- Dashboard summaries for income, expenses, net cashflow, category spend, budgets, and recent transactions.

The MVP must not include:

- Bank integrations.
- Hardcoded secrets.
- A suggestion to cancel OpenAI.
- Network-dependent tests as the default test path.

### 1.4 Behavior Rules Extracted

Required parser and category behavior:

- Missing currency must produce `needsClarification=true`.
- Unclear messages should ask a clarifying question instead of guessing.
- Bolt ride maps to `Transport`.
- Bolt Food, Uber Eats, and Too Good To Go map to `Restaurants / Cafes / Fun`.
- Maria Granel, Celeiro, Consigo, Pingo Doce, Auchan, Aldi, and Continente map to `Groceries`.
- Vodafone, EPAL, and EDP map to `Utilities`.
- IKEA and household essentials map to `Home`.
- Flights map to `Travel`.

Required default categories:

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

Required default budgets in EUR:

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

## 2. Current vs Target Behavior Map

| Area                  | Current behavior    | Target behavior                                                      | First proof target                   |
| --------------------- | ------------------- | -------------------------------------------------------------------- | ------------------------------------ |
| Repo structure        | Only planning files | TypeScript monorepo with `apps`, `services`, `packages`              | Workspace commands resolve           |
| Dependency management | None                | pnpm workspaces plus Turborepo or workspace scripts                  | `pnpm install`, `pnpm -r test`       |
| Local infrastructure  | None                | Docker Compose for Postgres and Redis                                | Containers start and health check    |
| Shared contracts      | None                | Zod schemas and shared TS types                                      | Typecheck and unit tests pass        |
| Category rules        | Documented only     | Tested deterministic matcher                                         | Merchant examples pass               |
| Budget logic          | None                | Helpers for period windows, spend totals, remaining budget, warnings | Budget tests pass                    |
| Database              | None                | Prisma schema, migration, seed                                       | Prisma validate/migrate/seed succeed |
| Parser                | None                | Fastify parser service and fallback parser                           | Sample prompts parse offline         |
| API                   | None                | Fastify transaction, dashboard, budget endpoints                     | API route tests pass                 |
| Telegram bot          | None                | Telegraf service with allowlist and commands                         | Handler tests pass offline           |
| Web dashboard         | None                | Next.js dashboard and transaction editor                             | Local page renders and talks to API  |
| Worker                | None                | Minimal BullMQ worker placeholder                                    | Worker starts with Redis             |
| Docs                  | Planning docs only  | README, env, setup, commands, behavior notes                         | New developer can run local path     |

## 3. Target Architecture

### 3.1 Repository Layout

Planned layout:

```text
apps/
  web/
  bot/

services/
  api/
  parser/
  worker/

packages/
  config/
  db/
  shared/

docs/
  architecture.md
  parser-behavior.md
  telegram-setup.md
  local-development.md
```

Root files:

```text
.env.example
.gitignore
AGENTS.md
PLAN.md
README.md
docker-compose.yml
package.json
pnpm-workspace.yaml
tsconfig.base.json
turbo.json
```

### 3.2 Service Responsibilities

`apps/web`:

- User-facing dashboard.
- Reads dashboard and transaction data from API.
- Allows category edits and transaction deletes.
- Does not talk directly to the database.

`apps/bot`:

- Telegram entrypoint.
- Validates `TELEGRAM_ALLOWED_USER_IDS`.
- Forwards natural text to API.
- Maps commands to API endpoints.
- Does not parse or persist directly.

`services/api`:

- Main backend boundary.
- Owns transaction write flow.
- Calls parser service.
- Writes transactions and parse events through `packages/db`.
- Generates budget feedback.
- Serves dashboard and budget endpoints.

`services/parser`:

- Accepts raw message, default currency, and timezone.
- Uses deterministic fallback when `OPENAI_API_KEY` is missing.
- Uses OpenAI structured output when configured.
- Always validates output with shared Zod schemas.

`services/worker`:

- Starts BullMQ connection.
- Provides future place for summaries/reminders.
- MVP should keep scheduled jobs disabled unless explicitly configured.

`packages/shared`:

- Zod schemas.
- Public TypeScript types.
- Category constants and deterministic category matcher.
- Budget helper functions.
- Currency helper functions.

`packages/db`:

- Prisma schema.
- Migrations.
- Seed script.
- Prisma client export.

`packages/config`:

- Shared environment parsing.
- Per-service config schemas.
- No secrets committed.

## 4. Data And API Design Plan

### 4.1 Database Tables

`users`:

- `id`
- `telegramUserId`
- `email`
- `defaultCurrency`
- `timezone`
- `createdAt`
- `updatedAt`

`categories`:

- `id`
- `name`
- `kind`
- `parentCategoryId`
- `isDefault`
- `createdAt`
- `updatedAt`

`transactions`:

- `id`
- `userId`
- `type`
- `amount`
- `currency`
- `amountEur`
- `amountUsd`
- `categoryId`
- `description`
- `merchant`
- `source`
- `rawMessage`
- `transactionDate`
- `createdAt`
- `updatedAt`
- `deletedAt`

`budgets`:

- `id`
- `userId`
- `categoryId`
- `period`
- `limitAmount`
- `currency`
- `isActive`
- `createdAt`
- `updatedAt`

`exchange_rates`:

- `id`
- `baseCurrency`
- `quoteCurrency`
- `rate`
- `source`
- `date`
- `createdAt`

`parse_events`:

- `id`
- `userId`
- `rawMessage`
- `parserResponse`
- `status`
- `createdAt`

### 4.2 Shared Schema Plan

Create shared schemas before service code:

- `CurrencySchema`: `EUR`, `USD`, `ILS`.
- `TransactionTypeSchema`: `expense`, `income`, `transfer`, `refund`.
- `CategoryNameSchema`: known category names.
- `ParserRequestSchema`.
- `ParsedTransactionSchema`.
- `ParserResponseSchema`.
- `CreateTransactionSchema`.
- `UpdateTransactionSchema`.
- `BudgetPeriodSchema`: `week`, `month`.
- `BudgetStatusSchema`.
- `DashboardMonthResponseSchema`.
- `DashboardWeekResponseSchema`.
- `TelegramFeedbackSchema`.

Schema rule:

- Services may transform data internally, but all external route inputs and outputs should use shared schemas.

### 4.3 API Endpoint Plan

Parser service:

- `GET /health`
- `POST /parse-transaction`

API service:

- `GET /health`
- `POST /transactions/from-message`
- `GET /transactions`
- `POST /transactions`
- `PATCH /transactions/:id`
- `DELETE /transactions/:id`
- `POST /transactions/undo-last`
- `GET /dashboard/month`
- `GET /dashboard/week`
- `GET /dashboard/category-breakdown`
- `GET /dashboard/cashflow`
- `GET /budgets`
- `PATCH /budgets/:id`
- `GET /budgets/status?period=week|month`

Bot command mapping:

- `/summary`: API month summary.
- `/week`: API week dashboard or budget status.
- `/month`: API month dashboard or budget status.
- `/budgets`: API budget status.
- `/undo`: API undo last.
- `/help`: static examples.

## 5. Pre-Mortem And Mitigations

### 5.1 Scope Creep

Failure mode:

- The microservice structure pulls the project into infrastructure work before the MVP flow works.

Mitigation:

- Implement a vertical local path early: parser fallback -> API from-message -> DB save -> feedback.
- Keep worker minimal.
- Do not add bank imports, auth providers, deployment pipelines, or recurring detection during MVP.

### 5.2 Parser Overconfidence

Failure mode:

- The parser guesses category, amount, or currency when the message is unclear.

Mitigation:

- Shared parser response must include `needsClarification`.
- Tests must cover missing currency and unclear input.
- Deterministic fallback should prefer clarification over weak guesses.
- OpenAI response must be schema-validated and normalized.

### 5.3 Category Rule Collisions

Failure mode:

- Generic words like `food` override specific merchants like Bolt ride or Bolt Food.

Mitigation:

- Put higher-specificity merchant rules before generic category rules.
- Add regression tests for ambiguous examples.
- Keep rule order documented in `docs/parser-behavior.md`.

### 5.4 Budget Math Drift

Failure mode:

- Weekly and monthly totals disagree because period windows, timezones, deleted transactions, or currency conversions are inconsistent.

Mitigation:

- Centralize period window calculation.
- Always use user timezone.
- Exclude soft-deleted transactions.
- Store original and normalized amounts.
- Test week/month boundaries.

### 5.5 Telegram Security Mistakes

Failure mode:

- Bot accepts messages from an unintended Telegram user.

Mitigation:

- Deny by default if allowlist is empty.
- Parse allowlist as exact string IDs.
- Test allowed and denied handler paths.

### 5.6 Environment Configuration Drift

Failure mode:

- Services use different env var names or fail silently when config is missing.

Mitigation:

- Use `packages/config`.
- Add `.env.example` during scaffold slice.
- Validate env on service startup.
- Keep config docs current.

### 5.7 Tests Depend On External Services

Failure mode:

- Default tests fail without OpenAI, Telegram, Postgres, or Redis.

Mitigation:

- Unit tests must be offline by default.
- Integration tests that require Docker should be clearly named and opt-in.
- OpenAI and Telegram live checks should be manual and documented.

### 5.8 Frontend Becomes Decorative Instead Of Useful

Failure mode:

- Dashboard looks polished but does not support actual review/edit workflows.

Mitigation:

- Build dashboard around operational views: current month, current week, budget progress, recent transactions, edit/delete.
- Avoid landing-page work.
- Use compact tables, filters, and charts.

## 6. Detailed Execution Plan

Each slice below must start with a brief inspection note before edits and end with acceptance checks. No slice should start until the prior slice is checked or intentionally deferred.

### Slice 0: Plan Review Gate

Purpose:

- Freeze the intended implementation sequence before any code work.

Files touched:

- `AGENTS.md`
- `PLAN.md`

Steps:

1. Review `AGENTS.md` for project rules and required plan order.
2. Review `PLAN.md` for coverage of all required sections.
3. Confirm the repo is still planning-only.
4. Decide whether `PLAN.md` is detailed enough to approve implementation.

Acceptance checks:

- Plan includes inspection findings.
- Plan includes current-to-target behavior map.
- Plan includes files to add/edit.
- Plan includes pre-mortem and mitigations.
- Plan includes small implementation slices.
- Plan includes focused tests and live checks.
- Plan includes docs updates.

Gate:

- Implementation may begin only after explicit user approval.

### Slice 1: Root Monorepo Scaffold

Purpose:

- Create the minimum workspace foundation without service business logic.

Inspection before edits:

- Check existing root files.
- Check git status.
- Check whether pnpm, node, and docker are available.

Files to add:

- `package.json`
- `pnpm-workspace.yaml`
- `turbo.json`
- `tsconfig.base.json`
- `.gitignore`
- `.env.example`
- `docker-compose.yml`
- `README.md`

Planned details:

- Root `package.json` should be private.
- Root scripts should include `dev`, `build`, `test`, `typecheck`, `lint`, `format`, and `db:*` placeholders only when backed by package scripts.
- Workspace packages should include `apps/*`, `services/*`, and `packages/*`.
- Docker Compose should start Postgres and Redis first.
- `.env.example` should include safe placeholders only.

Focused checks:

- `pnpm install`
- `pnpm -r typecheck`
- `docker compose config`
- Optional after install: `pnpm -r test`

Docs update:

- README gets project overview, prerequisites, repo layout, and initial local infrastructure commands.

Gate:

- Root workspace commands must exist and be documented before adding packages.

### Slice 2: Shared Package Foundation

Purpose:

- Establish the contracts and deterministic rules that every service will use.

Inspection before edits:

- Review root workspace config.
- Review README command names.
- Check whether TypeScript/Vitest conventions exist from Slice 1.

Files to add:

- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/vitest.config.ts`
- `packages/shared/src/index.ts`
- `packages/shared/src/currencies.ts`
- `packages/shared/src/categories.ts`
- `packages/shared/src/category-rules.ts`
- `packages/shared/src/parser-schemas.ts`
- `packages/shared/src/transaction-schemas.ts`
- `packages/shared/src/budget-schemas.ts`
- `packages/shared/src/budget-helpers.ts`
- `packages/shared/src/date-helpers.ts`
- `packages/shared/src/__tests__/category-rules.test.ts`
- `packages/shared/src/__tests__/budget-helpers.test.ts`

Planned details:

- Category constants should come from one exported list.
- Rule matcher should return category plus reason/confidence metadata.
- Budget helpers should separate calculation from formatting.
- Date helpers should accept timezone explicitly.
- Zod schemas should be exported with inferred TypeScript types.

Focused checks:

- `pnpm --filter @trackx/shared test`
- `pnpm --filter @trackx/shared typecheck`

Docs update:

- Add category rule notes to README or `docs/parser-behavior.md` if docs folder exists in this slice.

Gate:

- Shared schemas and category tests pass before parser, API, or bot work starts.

### Slice 3: Config Package

Purpose:

- Prevent each service from inventing env parsing.

Inspection before edits:

- Review `.env.example`.
- Review expected env vars from product plan.

Files to add:

- `packages/config/package.json`
- `packages/config/tsconfig.json`
- `packages/config/src/index.ts`
- `packages/config/src/common.ts`
- `packages/config/src/api.ts`
- `packages/config/src/parser.ts`
- `packages/config/src/bot.ts`
- `packages/config/src/worker.ts`
- `packages/config/src/__tests__/config.test.ts`

Planned env vars:

- `DATABASE_URL`
- `REDIS_URL`
- `OPENAI_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_USER_IDS`
- `DEFAULT_TIMEZONE`
- `DEFAULT_CURRENCY`
- `API_PORT`
- `PARSER_PORT`
- `BOT_PORT`
- `API_BASE_URL`
- `PARSER_BASE_URL`

Focused checks:

- Config tests for required and optional env behavior.
- Typecheck config package.

Docs update:

- `.env.example` and README must match config package exactly.

Gate:

- Services should not read `process.env` directly except through `packages/config`.

### Slice 4: Database Package

Purpose:

- Create the persistent data model and seed data.

Inspection before edits:

- Review data model from source plan.
- Review shared enums and schema names.
- Confirm Docker Compose Postgres service name and URL.

Files to add:

- `packages/db/package.json`
- `packages/db/tsconfig.json`
- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/seed.ts`
- `packages/db/src/index.ts`
- `packages/db/src/client.ts`
- `packages/db/src/seed-data.ts`
- `packages/db/src/__tests__/seed-data.test.ts`

Files likely edited:

- Root `package.json` scripts for `db:generate`, `db:migrate`, `db:seed`, `db:studio`.
- `.env.example`
- README database setup section.

Planned Prisma models:

- `User`
- `Category`
- `Transaction`
- `Budget`
- `ExchangeRate`
- `ParseEvent`

Planned enum models:

- `Currency`
- `TransactionType`
- `CategoryKind`
- `BudgetPeriod`
- `TransactionSource`
- `ParseStatus`

Focused checks:

- `pnpm --filter @trackx/db prisma validate`
- `pnpm db:generate`
- `pnpm db:migrate`
- `pnpm db:seed`
- Seed data test confirms categories and budget defaults.

Docs update:

- README database setup.
- Seed data notes.

Gate:

- Complete. Database schema, migration, Prisma client generation, and seed data have been verified locally.

### Slice 5: OpenAI Parser Service

Purpose:

- Parse natural-language finance messages through OpenAI structured output.

Inspection before edits:

- Review shared parser schemas.
- Review category rule tests.
- Review examples from the source plans.

Files added:

- `services/parser/package.json`
- `services/parser/tsconfig.json`
- `services/parser/vitest.config.ts`
- `services/parser/src/index.ts`
- `services/parser/src/server.ts`
- `services/parser/src/routes.ts`
- `services/parser/src/__tests__/routes.test.ts`

Production-prep relocation:

- Parser implementation files now live in `packages/parser-core/src`.
- Parser prompt and OpenAI tests now live in `packages/parser-core/src/__tests__`.
- Live eval files now live in `packages/parser-core/src/eval`.
- `services/parser` remains the local Fastify HTTP adapter.

Implemented parser behavior:

- Calls OpenAI as the primary parser.
- Uses structured output with a strict parser response JSON schema.
- Validates model output with shared parser Zod schemas.
- Keeps category and split-message rules in prompt guidance.
- Returns a clear unavailable response if `OPENAI_API_KEY` is missing.
- Does not implement a heuristic fallback parser as the product parser.

Focused checks:

- Parser tests mock OpenAI and pass offline.
- Route tests validate request and response schemas.
- Manual local checks can run without a key for health/unavailable behavior.
- Live OpenAI checks require `OPENAI_API_KEY`.

Docs update:

- `docs/parser-behavior.md` with OpenAI parser behavior, structured output, clarification policy, and examples.

Gate:

- Complete. Parser service must stay OpenAI-first before API from-message work starts.

### Slice 6: API Service Base And Transactions

Purpose:

- Create the backend boundary and transaction persistence flow.

Inspection before edits:

- Review Prisma client exports.
- Review parser service route contract.
- Review shared transaction schemas.

Files added:

- `services/api/package.json`
- `services/api/tsconfig.json`
- `services/api/vitest.config.ts`
- `services/api/src/index.ts`
- `services/api/src/server.ts`
- `services/api/src/routes/health.ts`
- `services/api/src/routes/transactions.ts`
- `services/api/src/repositories/transactions.ts`
- `services/api/src/repositories/users.ts`
- `services/api/src/services/transaction-service.ts`
- `services/api/src/__tests__/transactions.test.ts`

Planned endpoint behavior:

- `GET /health`: basic service health.
- `GET /transactions`: list non-deleted transactions.
- `POST /transactions`: create manual transaction.
- `PATCH /transactions/:id`: update category, description, amount, date as allowed.
- `DELETE /transactions/:id`: soft delete.
- `POST /transactions/undo-last`: soft delete most recent transaction for the user/source.

Focused checks:

- Route tests for create/list/update/delete/undo.
- Soft-deleted transactions do not appear in list.
- User lookup path works for Telegram user and default local user.

Docs update:

- README API commands.
- API endpoint notes.

Gate:

- Complete. Manual transaction CRUD works before budget feedback is added.

### Slice 7: Budget And Currency Logic

Purpose:

- Make budget status and dashboard summaries correct for saved transactions.

Inspection before edits:

- Review budget defaults from seed.
- Review exchange rate seed data.
- Review date helper tests.

Files added:

- `services/api/src/services/budget-service.ts`
- `services/api/src/repositories/budgets.ts`
- `services/api/src/routes/budgets.ts`
- `services/api/src/__tests__/budgets.test.ts`

Files edited:

- `packages/shared/src/budget-helpers.ts`
- `packages/shared/src/budget-schemas.ts`
- `services/api/src/server.ts`
- `services/api/src/repositories/users.ts`
- `services/api/src/__tests__/transactions.test.ts`
- `README.md`
- `docs/local-development.md`
- `PLAN.md`

Implemented behavior:

- Calculate current week based on user timezone.
- Calculate current month based on user timezone.
- Exclude income from expense budgets.
- Include income in cashflow summaries.
- Exclude soft-deleted transactions.
- Return percentage used and remaining amount.
- Count transactions only when they use the same currency as the budget.
- Return `GET /budgets`.
- Return `GET /budgets/status?period=week|month`.
- Return `GET /dashboard/week`.
- Return `GET /dashboard/month`.

Deferred behavior:

- Real exchange-rate conversion using `exchange_rates`.
- Telegram-friendly budget feedback.
- Parser-to-database `from-message` budget feedback.

Focused checks:

- Budget unit tests for below budget, near budget, over budget.
- API budget route tests for active budgets and invalid periods.
- Dashboard route tests for week and month.
- Full package test and typecheck pass.

Docs update:

- README budget behavior.
- `docs/local-development.md` with budget check examples.

Gate:

- Complete. Budget status and dashboard read endpoints work before Telegram bot integration.

### Slice 8: API From-Message Vertical Flow

Purpose:

- Connect parser, persistence, budget calculation, and feedback.

Inspection before edits:

- Review parser client contract.
- Review transaction service.
- Review parse event model.

Files added:

- `services/api/src/clients/parser-client.ts`
- `services/api/src/services/from-message-service.ts`
- `services/api/src/repositories/parse-events.ts`
- `services/api/src/__tests__/from-message.test.ts`

Files edited:

- `services/api/src/routes/transactions.ts`
- `services/api/src/server.ts`
- `services/api/src/services/transaction-service.ts`
- `README.md`
- `docs/local-development.md`
- `PLAN.md`

Implemented behavior:

- Accept raw message, user identifier, timezone, and default currency.
- Call parser service.
- Store a parse event for success, clarification, or failure.
- If parser needs clarification, do not create transactions.
- If parser succeeds, create one or more transactions.
- Return feedback summary suitable for Telegram.
- Validate parser HTTP responses with shared parser schemas.

Focused checks:

- `spent 15 eu on food` creates one expense and feedback.
- Split message creates two transactions.
- `earned 200 dollars` creates income.
- Missing currency returns clarification and creates no transaction.
- Parser failure stores a failure event and creates no transaction.
- Full package test and typecheck pass.

Docs update:

- Add from-message examples to README.
- Add from-message curl example to local development docs.

Gate:

- Complete. End-to-end local API path works before bot service.

### Slice 9: Telegram Bot Service

Purpose:

- Add Telegram as the primary input surface.

Inspection before edits:

- Review API from-message response.
- Review config package bot env parsing.
- Confirm no live Telegram token is required for tests.

Files added:

- `apps/bot/package.json`
- `apps/bot/tsconfig.json`
- `apps/bot/vitest.config.ts`
- `apps/bot/Dockerfile`
- `apps/bot/src/index.ts`
- `apps/bot/src/server.ts`
- `apps/bot/src/bot.ts`
- `apps/bot/src/commands.ts`
- `apps/bot/src/api-client.ts`
- `apps/bot/src/allowlist.ts`
- `apps/bot/src/__tests__/allowlist.test.ts`
- `apps/bot/src/__tests__/commands.test.ts`
- `docs/telegram-setup.md`

Files edited:

- `package.json`
- `docker-compose.yml`
- `README.md`
- `docs/local-development.md`
- `PLAN.md`

Implemented behavior:

- Deny all users when `TELEGRAM_ALLOWED_USER_IDS` is empty.
- Accept only exact allowed user IDs.
- Forward normal text to API.
- Reply with API feedback or clarification.
- Implement `/summary`, `/week`, `/month`, `/budgets`, `/undo`, `/help`.
- Include `/start` if helpful, but keep `/help` as the behavior reference.
- Join the full Docker stack as the `bot` service.

Focused checks:

- Allowlist unit tests.
- Command handler tests with mocked API client.
- Full package test and typecheck pass.
- Manual Telegram test only after user provides token and allowed ID.

Docs update:

- `docs/telegram-setup.md`.
- `.env.example` bot vars.

Gate:

- Complete. Bot tests pass without Telegram network access.

### Slice 10: Web Dashboard

Purpose:

- Add the visual review and correction surface.

Status: Complete.

Inspection before edits:

- Review API dashboard endpoints.
- Review transaction update/delete endpoints.
- Review frontend design requirements in repo guidelines.

Files added:

- `apps/web/package.json`
- `apps/web/next.config.ts`
- `apps/web/tsconfig.json`
- `apps/web/postcss.config.mjs`
- `apps/web/tailwind.config.ts`
- `apps/web/Dockerfile`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/dashboard/page.tsx`
- `apps/web/src/app/transactions/page.tsx`
- `apps/web/src/lib/api.ts`
- `apps/web/src/lib/format.ts`
- `apps/web/src/lib/actions.ts`
- `apps/web/src/components/app-nav.tsx`
- `apps/web/src/components/dashboard-summary.tsx`
- `apps/web/src/components/budget-list.tsx`
- `apps/web/src/components/recent-transactions-table.tsx`
- `apps/web/src/components/edit-transaction-form.tsx`
- `apps/web/src/components/delete-transaction-button.tsx`
- `apps/web/src/components/transactions-table.tsx`
- `apps/web/src/styles/globals.css`

Files edited:

- `package.json`
- `docker-compose.yml`
- `.env.example`
- `README.md`
- `docs/local-development.md`
- `PLAN.md`

Implemented behavior:

- First screen is the operational dashboard, not a marketing page.
- Monthly income, expenses, and net summary from `GET /dashboard/month`.
- Weekly and monthly budget progress from dashboard endpoints.
- Recent transactions table with link to full transactions view.
- Transactions page with edit form and delete action via server actions.
- Server-side API reads through `WEB_API_BASE_URL`.
- Docker web service calls API at `http://api:4001`.

Focused checks:

- `pnpm --filter @trackx/web typecheck`
- `pnpm --filter @trackx/web build`
- Start web app locally.
- Browser check dashboard page.
- Browser check edit/delete behavior if API is running.

Docs update:

- README web app section.
- Local development web startup notes.

Gate:

- Complete. Dashboard renders real API-backed data.

### Slice 11: Worker Placeholder

Purpose:

- Reserve worker structure without inventing future scope.

Status: Complete.

Inspection before edits:

- Review Redis config.
- Review any future summary requirements in source plan.

Files added:

- `services/worker/package.json`
- `services/worker/tsconfig.json`
- `services/worker/vitest.config.ts`
- `services/worker/Dockerfile`
- `services/worker/src/index.ts`
- `services/worker/src/queues.ts`
- `services/worker/src/jobs/weekly-summary.ts`
- `services/worker/src/jobs/monthly-summary.ts`
- `services/worker/src/__tests__/jobs.test.ts`

Files edited:

- `package.json`
- `docker-compose.yml`
- `.env.example`
- `README.md`
- `docs/local-development.md`
- `PLAN.md`

Implemented behavior:

- Start worker process and connect to Redis through BullMQ.
- Register placeholder handlers for weekly and monthly summary jobs.
- Keep scheduled jobs disabled unless `WORKER_ENABLE_SCHEDULES=true`.
- Exit clearly on invalid config or Redis connection failure.
- Join the Docker stack as the `worker` service.

Focused checks:

- Worker placeholder unit tests pass offline.
- Worker starts with Redis.
- Worker exits clearly if Redis config is invalid.

Docs update:

- README worker note.
- Local development worker startup notes.

Gate:

- Complete. Worker stays minimal and does not run live schedules by default.

### Slice 12: Final MVP Hardening

Purpose:

- Stabilize the local workflow and make the MVP reproducible.

Status: Complete.

Inspection before edits:

- Review all docs against actual commands.
- Review all env vars against config package.
- Review tests for offline default behavior.

Files added:

- `docs/architecture.md`

Files edited:

- `README.md`
- `.env.example`
- `docs/local-development.md`
- `docs/parser-behavior.md`
- `docs/telegram-setup.md`
- `package.json`
- `PLAN.md`

Implemented behavior:

- Architecture doc with service map, Telegram flow, dashboard flow, worker flow, and non-goals.
- README quick start, troubleshooting, and MVP-complete status.
- Fresh-install walkthrough in local development docs.
- `.env.example` comments for config ownership and Docker secret exports.
- Root `pnpm mvp:check` script for typecheck, test, and format:check.

Focused checks:

- Fresh install path.
- Docker infrastructure path.
- Prisma migration and seed path.
- Parser offline tests.
- API tests.
- Bot handler tests.
- Web build.
- Root `pnpm typecheck`.
- Root `pnpm test`.
- Root `pnpm build`.
- End-to-end from-message curl and dashboard verification.

Docs update:

- Final README pass.
- Troubleshooting section.

Gate:

- Complete. A fresh local run can log a sample expense through the API path and display it on the dashboard.

## 7. Cross-Slice File Plan

### 7.1 Planning Files

- `AGENTS.md`: repo rules and agent operating instructions.
- `PLAN.md`: this detailed implementation plan.

### 7.2 Root Files

- `.env.example`
- `.gitignore`
- `README.md`
- `docker-compose.yml`
- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.base.json`
- `turbo.json`

### 7.3 Apps

- `apps/web`
- `apps/bot`

### 7.4 Services

- `services/api`
- `services/parser`
- `services/worker`

### 7.5 Packages

- `packages/shared`
- `packages/config`
- `packages/db`

### 7.6 Docs

- `docs/architecture.md`
- `docs/local-development.md`
- `docs/parser-behavior.md`
- `docs/telegram-setup.md`

## 8. Test Strategy

### 8.1 Default Offline Tests

These should run without OpenAI, Telegram, Postgres, or Redis:

- Shared category rule tests.
- Shared budget helper tests.
- Config parser tests.
- Parser fallback tests.
- Bot allowlist and command tests with mocked API client.
- Pure service unit tests.

### 8.2 Docker-Backed Integration Tests

These may require Postgres and Redis:

- Prisma migration check.
- Prisma seed check.
- API route tests that use a test database.
- Worker Redis startup check.

### 8.3 Manual Live Checks

Use only when relevant and when secrets are configured locally:

- OpenAI parser mode.
- Telegram bot with real bot token and allowed user ID.
- Full local web dashboard in browser.

### 8.4 Required Sample Messages

Parser/API tests should cover:

- `spent 15 eu on food`
- `spent 2.3 euro on bus`
- `spent 50 eu on wipes (20eu) and new coffee maker (30eu)`
- `earned 200 dollars`
- `earned 2000 ILS`
- `spent 200 on a flight`
- `spent 15 on food`
- `bolt ride 7 eur`
- `bolt food 14 eur`
- `pingo doce 32 eur`
- `vodafone 82 eur`
- `ikea shelf 35 eur`

## 9. Documentation Plan

### 9.1 README

README should include:

- Product summary.
- MVP scope.
- Repo layout.
- Prerequisites.
- Environment setup.
- Docker Compose setup.
- Database migration and seed commands.
- Service startup commands.
- Test commands.
- Sample API requests.
- Troubleshooting.

### 9.2 Architecture Doc

`docs/architecture.md` should include:

- Service responsibility map.
- Request flow from Telegram to API to parser to DB.
- Dashboard data flow.
- Shared package boundaries.
- Explicit non-goals.

### 9.3 Parser Behavior Doc

`docs/parser-behavior.md` should include:

- Supported message forms.
- Clarification behavior.
- Category rule order.
- OpenAI mode vs fallback mode.
- Examples and expected outputs.

### 9.4 Telegram Setup Doc

`docs/telegram-setup.md` should include:

- Required env vars.
- How to find Telegram user ID.
- Allowlist behavior.
- Local webhook or polling strategy.
- Safety notes.

### 9.5 Local Development Doc

`docs/local-development.md` should include:

- One-command local path if available.
- Per-service startup path.
- Docker services.
- Database reset and seed.
- Manual curl examples.

## 10. Approval Gates

Gate A has been approved and Slice 1 has been executed.

Completed:

- Gate A: Approve this detailed plan.
- Gate B: Root scaffold added and validated.
- Gate C: Shared contracts and config package added and validated.

Remaining gates:

- Gate D: Approve database schema.
- Gate E: Approve parser fallback behavior.
- Gate F: Approve API transaction and budget behavior.
- Gate G: Approve Telegram bot behavior.
- Gate H: Approve dashboard behavior.
- Gate I: Approve MVP hardening and docs.

Each gate should include:

- What changed.
- What commands were run.
- What passed.
- What failed or was skipped.
- What the next slice will touch.

## 11. Immediate Next Step

The local MVP gate is complete.

Next action:

1. Commit the local MVP baseline.
2. Plan the production-prep migration from `services/api` Fastify endpoints into `apps/web/src/app/api` Vercel Route Handlers.
3. Keep deployment paused until dashboard protection/auth is decided.
4. Use Vercel Cron HTTP routes for future scheduled summaries; keep Redis/BullMQ out of production for now.
5. Do not start post-MVP implementation without an explicit new plan slice.
