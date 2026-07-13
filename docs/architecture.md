# TrackX Architecture

TrackX is a TypeScript monorepo for a Telegram-first expense tracker with a web dashboard. Services share contracts through `@trackx/shared`, reuse API domain logic through `@trackx/api-core`, reuse parser logic through `@trackx/parser-core`, and read environment values through `@trackx/config` where applicable.

## Service Map

| Component     | Path                   | Responsibility                                                             |
| ------------- | ---------------------- | -------------------------------------------------------------------------- |
| Web dashboard | `apps/web`             | Read API summaries and transactions; edit/delete via server actions        |
| Telegram bot  | `apps/bot`             | Allowlisted Telegram entrypoint; forwards text and commands to API         |
| API           | `services/api`         | Main backend boundary; transactions, budgets, dashboard, from-message flow |
| Parser        | `services/parser`      | Local Fastify adapter for parser HTTP requests                             |
| Worker        | `services/worker`      | Local BullMQ placeholder for queue learning; not production default        |
| API Core      | `packages/api-core`    | Route-independent API clients, repositories, and services                  |
| Parser Core   | `packages/parser-core` | OpenAI parser prompt, normalization, evals, and client                     |
| Shared        | `packages/shared`      | Zod schemas, category rules, budget helpers                                |
| Config        | `packages/config`      | Validated env parsing for API, parser, bot, worker                         |
| Database      | `packages/db`          | Prisma schema, migrations, seed data, client                               |

Postgres is the source of truth for users, transactions, budgets, parse events,
and pending clarification state. Redis backs BullMQ job state only for the local
worker experiment. The production path does not require Redis/BullMQ unless a
future queue workload appears. The web app does not talk to Postgres or Redis
directly.

## Telegram Message Flow

```text
User message in Telegram
  -> Cloudflare Worker (apps/webhook) OR apps/bot (local polling)
  -> POST /transactions/from-message on services/api
  -> if pending clarification exists: combine with original message
  -> if no pending clarification: classify safe edit intent against recent transactions
  -> if confident category edit: services/api validates and updates Postgres
  -> local API calls services/parser OR Vercel API calls @trackx/parser-core
  -> shared Zod validation + category guidance
  -> services/api stores parse event
  -> if parser needs clarification: services/api stores pending clarification
  -> if parsed successfully: create transaction(s) in Postgres
  -> if pending clarification existed: mark it resolved
  -> API returns Telegram-friendly feedback
  -> webhook worker replies via Telegram sendMessage
```

For local development you can still use `apps/bot` with polling. For cloud deploys, prefer the Cloudflare webhook worker documented in [cloudflare-webhook.md](./cloudflare-webhook.md).

If the parser needs clarification, the API stores the parse event, stores a
short-lived pending clarification row in Postgres, and creates no transactions.
The next Telegram text from the same user is parsed with the original message as
context.

Natural edit messages are API-owned. The model can only propose a structured
intent, and the API only writes a category update when the target transaction is
one of the user's recent active transactions, the category is valid, and model
confidence clears the API threshold. Low-confidence or ambiguous edits ask for a
clarification instead of writing.

Telegram correction commands are constrained API writes. `/category last
<category>` updates only the latest active Telegram transaction category after
the API validates the requested category. It remains available as a fallback.
Corrected merchant categories can be saved to `merchant_category_rules`; those
per-user rules are applied before broad Wallet category hints or model guesses
on later imports.

## Dashboard Data Flow

```text
Browser at apps/web
  -> server-side fetch to WEB_API_BASE_URL locally or same-host /api in production
  -> GET /dashboard/month OR /api/dashboard/month
  -> GET /dashboard/week OR /api/dashboard/week
  -> GET /transactions OR /api/transactions
  -> services/api adapter locally OR apps/web Route Handler on Vercel
  -> adapter calls @trackx/api-core
  -> @trackx/api-core reads Postgres through packages/db
  -> dashboard renders summaries, budgets, recent transactions
```

Edits and deletes use Next.js server actions that call:

- `PATCH /transactions/:id`
- `DELETE /transactions/:id`

## Worker Flow

```text
services/worker starts
  -> connects to Redis through BullMQ
  -> listens on queue "trackx-jobs"
  -> placeholder handlers: weekly-summary, monthly-summary
  -> scheduled jobs disabled unless WORKER_ENABLE_SCHEDULES=true
```

The worker does not call the API or Telegram in the MVP placeholder slice.

For production, prefer Vercel Cron routes for scheduled summaries instead of a 24/7 BullMQ worker.

## Shared Boundaries

`@trackx/shared` owns external contracts:

- Parser request/response schemas
- Transaction create/update schemas
- Budget and dashboard response schemas
- Canonical categories, currencies, and deterministic category rules

Services may transform data internally, but route inputs and outputs should use shared schemas.

`@trackx/api-core` owns route-independent API behavior:

- Parser and intent clients
- Prisma repository boundaries
- Transaction, budget, dashboard, from-message, and clarification services

`services/api` is the local Fastify adapter around this package. `apps/web/src/app/api`
is the Vercel Route Handler adapter around the same package. Both adapters
should call `@trackx/api-core` instead of duplicating business logic.

`@trackx/parser-core` owns route-independent parser behavior:

- OpenAI structured output parser
- Parser prompt and JSON schema
- Parser response normalization
- Live dogfood eval suites

`services/parser` is the local Fastify adapter around this package. The Vercel
Route Handler adapter calls this package in-process to avoid a separate parser
host in production.

`@trackx/config` owns env parsing for runtime services. Two web/worker vars are read directly today:

- `WEB_API_BASE_URL` in `apps/web`
- `WORKER_ENABLE_SCHEDULES` in `services/worker`

## Local Runtime Topology

Infrastructure-only mode:

```text
Docker: postgres, redis
pnpm: parser, api, web, bot, worker
```

Full Docker stack:

```text
Docker: postgres, redis, parser, api, bot, web, worker
```

Inside Docker, services use internal hostnames such as `postgres`, `redis`, `parser`, and `api`.

## Explicit Non-Goals (MVP)

- User authentication for the web dashboard
- Bank integrations or receipt OCR imports
- Sentry or production deployment pipelines
- Live scheduled worker jobs by default
- Production Redis/BullMQ without a real queue workload
- Recurring transaction detection

## Related docs

- [platform-stack.md](./platform-stack.md) — target cloud platforms (Vercel, Supabase, Cloudflare) and deployment decisions
- [cloudflare-webhook.md](./cloudflare-webhook.md) — Cloudflare Worker setup
- [local-development.md](./local-development.md) — local commands and Docker
