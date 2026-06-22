# TrackX

TrackX is a Telegram-first AI expense tracker. Send natural-language finance messages to a Telegram bot, parse them into structured transactions, store them in Postgres, update weekly and monthly budgets, and review the same data in a web dashboard.

The MVP vertical path is implemented locally: parser, API, bot, web dashboard, and a BullMQ worker placeholder. Production prep now includes same-origin Vercel Route Handlers in the web app. Production direction is Vercel Route Handlers, Supabase Postgres, and Cloudflare Telegram webhooks; no production Redis/BullMQ worker is planned for now.

## Quick Start

From a fresh clone:

```bash
cp .env.example .env
pnpm install
pnpm infra:up
pnpm db:migrate
pnpm db:seed
```

Add `OPENAI_API_KEY` to `.env` for live parsing, then start services in separate terminals:

```bash
pnpm parser:dev
pnpm api:dev
pnpm web:dev
```

Verify the MVP path:

```bash
curl -s \
  -H 'content-type: application/json' \
  -d '{"message":"spent 15 eur on food","timezone":"Europe/Lisbon","defaultCurrency":"EUR"}' \
  http://localhost:4001/transactions/from-message
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) and confirm the transaction appears.

Optional:

```bash
pnpm bot:dev      # requires TELEGRAM_BOT_TOKEN and allowlist in .env
pnpm worker:dev   # requires Redis from pnpm infra:up
```

Architecture notes live in [docs/architecture.md](./docs/architecture.md). Target cloud platform decisions live in [docs/platform-stack.md](./docs/platform-stack.md). Full local paths live in [docs/local-development.md](./docs/local-development.md).

## MVP Scope

Implemented locally:

- Telegram bot for natural-language expense and income logging
- Parser service with OpenAI structured output
- Fastify API for transactions, budgets, and dashboard data
- Prisma/Postgres data model with seed budgets and categories
- Next.js dashboard for month/week summaries and transaction edit/delete
- Same-origin Next.js API routes for Vercel deployment
- Supabase email/password auth for protected dashboard pages and web API routes
- BullMQ worker placeholder connected to Redis
- Shared Zod schemas and offline-first unit tests

Deferred after MVP:

- Bank integrations
- Sentry and deployment pipelines
- Live scheduled worker jobs
- Production Redis/BullMQ worker

## Repository Layout

```text
apps/
  web/                 Next.js dashboard
  bot/                 Telegram bot service (polling, local MVP)
  webhook/             Cloudflare Worker Telegram webhook

services/
  api/                 Fastify API service (local stepping stone before Vercel route migration)
  parser/              AI/parser service
  worker/              BullMQ worker placeholder (local experiment, not production default)

packages/
  api-core/            Route-independent API clients, repositories, and services
  config/              Shared environment parsing
  db/                  Prisma schema, migrations, seed data, client
  parser-core/         Route-independent OpenAI parser logic, prompt, and evals
  shared/              Zod schemas, types, category rules, budget helpers

docs/
  architecture.md
  cloudflare-webhook.md
  local-development.md
  parser-behavior.md
  platform-stack.md
  telegram-setup.md
```

## Prerequisites

- Node.js 22 or newer
- pnpm 10 or newer
- Docker with Docker Compose

Observed local versions during scaffold:

- Node.js `v24.6.0`
- pnpm `10.18.3`
- Docker `29.4.3`
- Docker Compose `v5.1.4`

## Setup

Create a local env file from the example:

```bash
cp .env.example .env
```

The example values are safe placeholders. Add real secrets only to `.env`, never to committed files.

Install dependencies:

```bash
pnpm install
```

Start local infrastructure:

```bash
pnpm infra:up
```

Check Docker Compose configuration:

```bash
pnpm infra:config
```

Stop local infrastructure:

```bash
pnpm infra:down
```

## Root Commands

```bash
pnpm dev
pnpm build
pnpm test
pnpm typecheck
pnpm mvp:check
pnpm lint
pnpm format
pnpm format:check
pnpm env:check
pnpm api:dev
pnpm bot:dev
pnpm web:dev
pnpm worker:dev
pnpm webhook:dev
pnpm parser:dev
pnpm db:validate
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm db:studio
pnpm infra:config
pnpm infra:up
pnpm infra:down
pnpm infra:logs
pnpm stack:config
pnpm stack:build
pnpm stack:up
pnpm stack:down
pnpm stack:logs
```

`pnpm mvp:check` runs typecheck, test, and format:check together.

## Packages

### `@trackx/shared`

Status: implemented in Slice 2.

Ownership:

- Shared Zod schemas for parser, transactions, budgets, dashboard responses, and Telegram feedback.
- Canonical category and currency constants.
- Deterministic category matcher.
- Pure budget and date helpers.

Focused commands:

```bash
pnpm --filter @trackx/shared test
pnpm --filter @trackx/shared typecheck
pnpm --filter @trackx/shared build
```

Parser/category behavior notes live in [docs/parser-behavior.md](./docs/parser-behavior.md).

### `@trackx/config`

Status: implemented in Slice 3.

Ownership:

- Validated environment parsing for API, parser, bot, and worker services.
- Shared default currency and timezone handling.
- Telegram allowlist parsing.
- Optional secret normalization, where empty strings become missing values.

Focused commands:

```bash
pnpm --filter @trackx/config test
pnpm --filter @trackx/config typecheck
pnpm --filter @trackx/config build
```

### `@trackx/db`

Status: implemented in Slice 4.

Ownership:

- Prisma schema for users, categories, transactions, budgets, exchange rates, and parse events.
- Prisma client factory for services.
- Seed data for the deterministic local user, default categories, and default EUR budgets.
- Public table RLS enabled for hosted Supabase, with explicit API-only deny policies for `anon`/`authenticated` access.

Focused commands:

```bash
pnpm --filter @trackx/db prisma validate
pnpm --filter @trackx/db test
pnpm --filter @trackx/db typecheck
pnpm db:validate
pnpm db:generate
pnpm db:migrate
pnpm db:migrate:status
pnpm db:migrate:deploy
pnpm db:seed
```

The local database uses the `postgres` Docker Compose service. For local Docker,
`DATABASE_URL` and `DIRECT_URL` can both point at
`postgresql://postgres:postgres@localhost:5432/trackx`.

For Supabase/Vercel, use two URLs:

- `DATABASE_URL`: Supabase transaction pooler URL for runtime/serverless queries.
- `DIRECT_URL`: Supabase session/direct URL for Prisma migrations.

Hosted database setup:

```bash
pnpm env:check -- --target=vercel
pnpm db:migrate:status
pnpm db:migrate:deploy
pnpm db:seed
```

### `@trackx/api-core`

Status: extracted during production-prep API migration.

Ownership:

- Route-independent API clients, repositories, and services.
- Transaction CRUD, budget/dashboard orchestration, from-message flow, pending clarification handling, and safe edit intent logic.
- Reusable boundary for the current Fastify service and future Next.js Route Handlers.

Focused commands:

```bash
pnpm --filter @trackx/api-core test
pnpm --filter @trackx/api-core typecheck
pnpm --filter @trackx/api-core build
```

### `@trackx/parser`

Status: implemented in Slice 5.

Ownership:

- Fastify parser service with `GET /health` and `POST /parse-transaction`.
- Local/Docker HTTP adapter around `@trackx/parser-core`.

Focused commands:

```bash
pnpm --filter @trackx/parser test
pnpm --filter @trackx/parser typecheck
pnpm --filter @trackx/parser dev
pnpm parser:dev
pnpm parser:eval
pnpm parser:eval -- --suite=new
```

Parser tests mock OpenAI and do not require `OPENAI_API_KEY`. Live parsing requires a real key in `.env`.

`pnpm parser:eval` runs the baseline 100-message dogfood suite against the real OpenAI parser and checks product-critical fields. Use `pnpm parser:eval -- --suite=new` for the fresh anti-overfit suite. Live eval is not part of `pnpm mvp:check` because it requires a paid model and can vary over time.

### `@trackx/parser-core`

Status: extracted during production-prep parser colocation.

Ownership:

- OpenAI structured-output parser for natural-language finance messages.
- Prompt guidance for categories, currencies, income, expenses, split messages, and clarification behavior.
- Request and response normalization through shared Zod schemas.
- Live parser eval cases used by `pnpm parser:eval`.
- Reusable parser boundary for the local Fastify parser service and Vercel Route Handlers.

Focused commands:

```bash
pnpm --filter @trackx/parser-core test
pnpm --filter @trackx/parser-core typecheck
pnpm --filter @trackx/parser-core build
pnpm --filter @trackx/parser-core eval -- --suite=new
```

### `@trackx/api`

Status: implemented through Slice 8.

Ownership:

- Fastify API service with `GET /health`.
- Local/Docker HTTP adapter until endpoint behavior is migrated into `apps/web` Route Handlers for Vercel.
- Manual transaction CRUD routes backed by `@trackx/api-core`.
- Default local user resolution for local development.
- Soft delete and undo-last transaction behavior.
- Safe latest-transaction category correction for Telegram command flows.
- Read-only budget status and dashboard summary routes.
- Parser-backed `from-message` route that stores parse events and creates transactions.
- API-owned natural edit intent routing for safe recent-transaction category updates.
- Postgres-backed pending clarification state for follow-up parser answers.
- EUR budget totals that include converted non-EUR transactions through cached exchange rates.
- Budget warning feedback after logged expenses when a category reaches 75% of a weekly or monthly budget.

Focused commands:

```bash
pnpm --filter @trackx/api test
pnpm --filter @trackx/api typecheck
pnpm --filter @trackx/api dev
pnpm api:dev
```

Current endpoints:

```text
GET    /health
GET    /transactions
POST   /transactions
POST   /transactions/from-message
PATCH  /transactions/:id
DELETE /transactions/:id
POST   /transactions/undo-last
POST   /transactions/update-last-category
GET    /budgets
GET    /budgets/status?period=week|month
GET    /dashboard/week
GET    /dashboard/month
```

`POST /transactions/from-message` first honors any pending clarification. If there is no pending clarification, the API can use OpenAI to classify safe edit intents such as "move the movie to fun" against recent transactions. Confident category edits are validated and written by the API. New expense or income messages continue to the parser service, which stores a parse event, creates transactions when parsing succeeds, and returns simple Telegram-friendly feedback.

Budget notes:

- Budget periods use the user's timezone.
- Soft-deleted transactions are excluded.
- Income is excluded from expense budgets and included in month cashflow.
- Categories at 75% or more of their budget return `warning`; categories over 100% return `over`.
- Successful message logging appends budget warning lines for affected expense categories.
- Non-EUR transactions are converted into EUR through Frankfurter exchange rates and cached in Postgres for budget totals.

### `@trackx/bot`

Status: implemented in Slice 9.

Ownership:

- Telegram bot runtime.
- Allowlist access control.
- Normal text forwarding to API `POST /transactions/from-message`.
- Telegram user id forwarding so the API can resolve pending clarifications.
- Commands for help, undo, category correction, weekly budgets, and month summary.

Focused commands:

```bash
pnpm --filter @trackx/bot test
pnpm --filter @trackx/bot typecheck
pnpm --filter @trackx/bot dev
pnpm bot:dev
```

Telegram setup notes live in [docs/telegram-setup.md](./docs/telegram-setup.md).

### `@trackx/webhook`

Status: implemented for Cloudflare Telegram webhooks.

Ownership:

- Cloudflare Worker entrypoint for Telegram webhook updates.
- Allowlist checks and command handling aligned with `apps/bot`.
- Calls the TrackX API and replies through Telegram `sendMessage`.

Focused commands:

```bash
pnpm --filter @trackx/webhook test
pnpm --filter @trackx/webhook typecheck
pnpm --filter @trackx/webhook dev
pnpm webhook:dev
pnpm --filter @trackx/webhook deploy
```

Cloudflare setup notes live in [docs/cloudflare-webhook.md](./docs/cloudflare-webhook.md).

### `@trackx/web`

Status: implemented in Slice 10.

Ownership:

- Next.js App Router dashboard.
- Supabase email/password auth for `/dashboard`, `/transactions`, and protected web API routes.
- Server-side API reads for month/week summaries, budgets, and transactions.
- Server actions for transaction edit and delete.
- Dense operational UI for review and correction workflows.
- Responsive console shell with desktop navigation and mobile bottom navigation.
- `/auth` placeholder route for the future auth shell; `/login` remains the active email/password entrypoint.

Focused commands:

```bash
pnpm --filter @trackx/web typecheck
pnpm --filter @trackx/web build
pnpm --filter @trackx/web dev
pnpm web:dev
```

The web app reads from `WEB_API_BASE_URL` when it is set. When it is unset,
the app uses same-origin `/api` Route Handlers on the incoming request host,
which is the default for Vercel and the recommended local path while testing
dashboard auth. In Docker, set it to `http://api:4001` when routing through the
Fastify API container.

Local `pnpm web:dev` reads the root `.env` through `apps/web/next.config.ts` so
Supabase auth middleware can protect `/dashboard`, `/transactions`, and the
same-origin data APIs during local testing.

### `@trackx/worker`

Status: implemented in Slice 11.

Ownership:

- BullMQ worker placeholder connected to Redis.
- Placeholder handlers for weekly and monthly summary jobs.
- Scheduled jobs disabled by default unless `WORKER_ENABLE_SCHEDULES=true`.
- Local learning/experimentation path only; production should use Vercel Cron routes if scheduled summaries are added.

Focused commands:

```bash
pnpm --filter @trackx/worker test
pnpm --filter @trackx/worker typecheck
pnpm --filter @trackx/worker dev
pnpm worker:dev
```

The worker uses `REDIS_URL` from `.env`. In Docker, it uses `redis://redis:6379`.

## Environment Variables

Variables used by TrackX services and tooling:

| Variable                    | Purpose                                            |
| --------------------------- | -------------------------------------------------- |
| `DATABASE_URL`              | Postgres connection string                         |
| `DIRECT_URL`                | Prisma migration connection string                 |
| `REDIS_URL`                 | Redis connection string                            |
| `OPENAI_API_KEY`            | Optional OpenAI key for parser and API edit intent |
| `OPENAI_MODEL`              | OpenAI model used by parser and API edit intent    |
| `PARSER_PORT`               | Parser service port                                |
| `PARSER_BASE_URL`           | Local Fastify parser service base URL              |
| `API_PORT`                  | API service port                                   |
| `API_BASE_URL`              | API service base URL                               |
| `TRACKX_API_SECRET`         | Shared Cloudflare-to-Vercel API secret             |
| `TELEGRAM_BOT_TOKEN`        | Telegram bot token                                 |
| `TELEGRAM_ALLOWED_USER_IDS` | Comma-separated allowlist of Telegram user IDs     |
| `BOT_PORT`                  | Bot service port                                   |
| `DEFAULT_TIMEZONE`          | Default user timezone                              |
| `DEFAULT_CURRENCY`          | Default user currency                              |

App-specific variables read outside `@trackx/config`:

| Variable                               | Purpose                                                   |
| -------------------------------------- | --------------------------------------------------------- |
| `WEB_API_BASE_URL`                     | Optional API base URL override for the dashboard          |
| `NEXT_PUBLIC_SITE_URL`                 | Public app URL for Supabase auth redirects                |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL for dashboard auth                   |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key for dashboard auth sessions |
| `WORKER_ENABLE_SCHEDULES`              | Enable BullMQ cron schedules (`true` / `false`)           |

Cloudflare Worker secrets for `apps/webhook` are configured with Wrangler (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALLOWED_USER_IDS`, `API_BASE_URL`, `TRACKX_API_SECRET`, optional `TELEGRAM_WEBHOOK_SECRET`). See [docs/cloudflare-webhook.md](./docs/cloudflare-webhook.md).

Production scheduled summaries, if added, should use Vercel Cron HTTP routes rather than Redis/BullMQ.

Docker stack secrets are passed through shell exports such as `TRACKX_OPENAI_API_KEY` and `TRACKX_TELEGRAM_BOT_TOKEN`. See [docs/local-development.md](./docs/local-development.md).

Run `pnpm env:check -- --target=local` before local startup and `pnpm env:check -- --target=vercel` before hosted migration/deploy work. The checker reports variable names and readiness only; it does not print secret values.

## Troubleshooting

### Dashboard shows "Dashboard unavailable"

- Confirm `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set for dashboard auth
- Leave `WEB_API_BASE_URL` unset for same-host `/api`, or point it to a running API such as `http://localhost:4001`
- Migrate and seed Postgres: `pnpm db:migrate && pnpm db:seed`

### `POST /transactions/from-message` fails or asks for clarification

- Confirm the parser is running: `curl http://localhost:4002/health`
- Add a real `OPENAI_API_KEY` to `.env` for live parsing
- Include currency in the message, for example `spent 15 eur on food`
- Natural category edits use the same API route, for example `move the movie to fun`

### Bot does not respond

- Set `TELEGRAM_BOT_TOKEN` and your numeric id in `TELEGRAM_ALLOWED_USER_IDS`
- An empty allowlist denies everyone by design
- Start API and parser before `pnpm bot:dev`

### Worker exits immediately

- Start Redis: `pnpm infra:up`
- Check `REDIS_URL` is a valid URL, default `redis://localhost:6379`

### Docker stack parser or bot lacks secrets

- Export `TRACKX_OPENAI_API_KEY`, `TRACKX_TELEGRAM_BOT_TOKEN`, and `TRACKX_TELEGRAM_ALLOWED_USER_IDS` in your shell before `pnpm stack:up`
- Do not commit real secrets to the repo

## MVP Status

The local MVP path is complete when:

1. `pnpm mvp:check` passes
2. `pnpm db:migrate` and `pnpm db:seed` succeed against local Postgres
3. A sample expense logged through `POST /transactions/from-message` appears on the dashboard

See [PLAN.md](./PLAN.md) for the full implementation history.

## Production Direction

The Vercel API migration layer now exists under `apps/web/src/app/api` and calls `@trackx/api-core`. Parser behavior has been extracted to `@trackx/parser-core` so Vercel can parse in-process without a separate parser host. Hosted Supabase is connected, public table RLS is enabled, and dashboard auth is protected by Supabase email/password sessions.

The Vercel project must be configured as the `apps/web` Next.js app:

- Framework: Next.js
- Root Directory: `apps/web`
- Build command/output directory: Vercel defaults for Next.js

`apps/web/next.config.ts` sets the monorepo output tracing root and explicitly includes Prisma's generated client engine so Vercel API routes can use `@trackx/db` at runtime.

## Docker Stack

Docker Compose can run local infrastructure only or the fuller local stack.

Infrastructure only:

```bash
pnpm infra:up
```

Full stack:

```bash
pnpm stack:build
pnpm stack:up
```

For live parser calls in Docker, export `TRACKX_OPENAI_API_KEY` in your shell before `pnpm stack:up`. Keep real secrets out of committed files.

The full stack runs Postgres, Redis, parser, API, bot, web, and worker containers. Details live in [docs/local-development.md](./docs/local-development.md).
