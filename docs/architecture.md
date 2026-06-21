# TrackX Architecture

TrackX is a TypeScript monorepo for a Telegram-first expense tracker with a web dashboard. Services share contracts through `@trackx/shared` and read environment values through `@trackx/config` where applicable.

## Service Map

| Component     | Path              | Responsibility                                                             |
| ------------- | ----------------- | -------------------------------------------------------------------------- |
| Web dashboard | `apps/web`        | Read API summaries and transactions; edit/delete via server actions        |
| Telegram bot  | `apps/bot`        | Allowlisted Telegram entrypoint; forwards text and commands to API         |
| API           | `services/api`    | Main backend boundary; transactions, budgets, dashboard, from-message flow |
| Parser        | `services/parser` | OpenAI structured-output parsing for natural-language finance messages     |
| Worker        | `services/worker` | Local BullMQ placeholder for queue learning; not production default        |
| Shared        | `packages/shared` | Zod schemas, category rules, budget helpers                                |
| Config        | `packages/config` | Validated env parsing for API, parser, bot, worker                         |
| Database      | `packages/db`     | Prisma schema, migrations, seed data, client                               |

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
  -> POST /parse-transaction on services/parser
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

## Dashboard Data Flow

```text
Browser at apps/web
  -> server-side fetch to WEB_API_BASE_URL
  -> GET /dashboard/month
  -> GET /dashboard/week
  -> GET /transactions
  -> services/api reads Postgres through packages/db
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
- Exchange-rate conversion in budget totals
- Recurring transaction detection

## Related docs

- [platform-stack.md](./platform-stack.md) — target cloud platforms (Vercel, Supabase, Cloudflare) and deployment decisions
- [cloudflare-webhook.md](./cloudflare-webhook.md) — Cloudflare Worker setup
- [local-development.md](./local-development.md) — local commands and Docker
