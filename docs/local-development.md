# Local Development

TrackX supports a pnpm-on-host workflow with Docker infrastructure, or a full Docker Compose stack.

## Fresh Install Path

Use this to verify the MVP from a clean clone:

```bash
cp .env.example .env
pnpm install
pnpm infra:up
pnpm db:migrate
pnpm db:seed
```

Add `OPENAI_API_KEY` to `.env`, then start services in separate terminals:

```bash
pnpm env:check -- --target=local
pnpm parser:dev
pnpm api:dev
pnpm web:dev
```

Run the end-to-end check:

```bash
curl -s \
  -H 'content-type: application/json' \
  -d '{"message":"spent 15 eur on food","timezone":"Europe/Lisbon","defaultCurrency":"EUR"}' \
  http://localhost:4001/transactions/from-message
```

Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) and confirm the expense appears with updated budget progress.

Run the static MVP checks:

```bash
pnpm mvp:check
pnpm build
```

Architecture overview: [architecture.md](./architecture.md)

## Database URLs

TrackX uses Prisma. Prisma has two database URL roles:

- `DATABASE_URL`: runtime application queries.
- `DIRECT_URL`: migration/admin connection.

For local Docker Postgres, both can use the same value:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/trackx"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/trackx"
```

For Supabase production, use the transaction pooler URL for `DATABASE_URL` and
the session/direct URL for `DIRECT_URL`. Keep both values in local `.env` and in
Vercel Project Environment Variables; never commit real database passwords.

After setting hosted Supabase URLs, deploy migrations and seed the database:

```bash
pnpm env:check -- --target=vercel
pnpm db:migrate:status
pnpm db:migrate:deploy
pnpm db:seed
```

## Infrastructure Only

Use this when you want to run the TypeScript services with `pnpm` on your machine, while Docker runs only Postgres and Redis.

```bash
pnpm infra:up
pnpm parser:dev
pnpm api:dev
pnpm web:dev
pnpm worker:dev
```

The web dashboard reads from `WEB_API_BASE_URL` only when it is set. Leave it
empty to use same-origin Next.js Route Handlers under `/api`, which is the
recommended local path while testing Supabase dashboard auth. Set it to
`http://localhost:4001` when you intentionally want the dashboard to talk to the
local Fastify API.

`pnpm web:dev` loads the root `.env` through the Next.js config so Supabase auth
middleware can read `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` during local dashboard testing.

The worker reads `REDIS_URL` from `.env` and keeps BullMQ schedules disabled unless `WORKER_ENABLE_SCHEDULES=true`. This worker is for local queue learning only; production should use Vercel Cron routes if scheduled summaries are added.

Open [http://localhost:3000](http://localhost:3000) after the API is running and the database is migrated/seeded.

## Full Docker Stack

Use this when you want Docker Compose to run the local services together.

```bash
pnpm stack:build
pnpm stack:up
```

For live parser calls inside Docker, pass the OpenAI key through your shell as `TRACKX_OPENAI_API_KEY`. Do not commit secrets to the repo.

```bash
export TRACKX_OPENAI_API_KEY="your-key"
pnpm stack:up
```

The stack starts:

- `postgres`: local Postgres database
- `redis`: local Redis service for future jobs
- `parser`: OpenAI parser service
- `api`: TrackX API service
- `bot`: Telegram bot service
- `web`: Next.js dashboard
- `worker`: BullMQ worker placeholder

Useful checks:

```bash
docker compose ps
curl http://localhost:4002/health
curl http://localhost:4001/health
curl http://localhost:4003/health
curl -I http://localhost:3000
```

Inside Docker, services talk to each other by service name. For example, the API container uses `postgres:5432` for the database, the parser service uses `parser:4002`, and the web container uses `api:4001` through `WEB_API_BASE_URL`.

## Web Dashboard

After Postgres is migrated and seeded and the API is healthy:

```bash
pnpm web:dev
```

Then open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).

The dashboard shows:

- monthly income, expenses, and net
- weekly and monthly budget progress
- recent transactions

Use [http://localhost:3000/transactions](http://localhost:3000/transactions) to edit categories or delete transactions.

## Worker

The worker is a long-running BullMQ process. It connects to Redis and registers placeholder summary job handlers. Scheduled jobs stay disabled unless you opt in.

This is not the production scheduling plan. Production scheduled summaries should use Vercel Cron HTTP routes so TrackX does not need a 24/7 worker or production Redis.

```bash
pnpm infra:up
pnpm worker:dev
```

Expected startup log:

```text
[worker] Listening on queue "trackx-jobs" at redis://localhost:6379
[worker] Scheduled jobs are disabled.
```

To enable cron schedules locally:

```bash
WORKER_ENABLE_SCHEDULES=true pnpm worker:dev
```

Invalid Redis configuration or connection failures exit with a clear error message.

## API Budget Checks

After Postgres is migrated and seeded, the API can return budget status and simple dashboard summaries.

```bash
curl http://localhost:4001/budgets
curl 'http://localhost:4001/budgets/status?period=week'
curl http://localhost:4001/dashboard/week
curl http://localhost:4001/dashboard/month
```

Budget totals are conservative in the MVP: they count non-deleted expense transactions in the same currency as the budget. Exchange-rate conversion is deferred until a dedicated currency slice.

## API From-Message Check

When the API and parser services are both running, the API can create transactions from natural-language messages through the parser service.

```bash
curl -s \
  -H 'content-type: application/json' \
  -d '{"message":"spent 15 eur on food","timezone":"Europe/Lisbon","defaultCurrency":"EUR"}' \
  http://localhost:4001/transactions/from-message
```

If the parser asks for clarification, the API stores the parse event but creates no transactions.

## Telegram Bot

The bot reads `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALLOWED_USER_IDS` from `.env` for local `pnpm bot:dev` runs.

```bash
pnpm bot:dev
```

For Docker stack runs, export `TRACKX_TELEGRAM_BOT_TOKEN` and `TRACKX_TELEGRAM_ALLOWED_USER_IDS` before `pnpm stack:up`. Details live in [telegram-setup.md](./telegram-setup.md).

## Troubleshooting

| Symptom                    | Likely fix                                                                                   |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| Dashboard unavailable      | Start API or use web `/api`; check `WEB_API_BASE_URL`; run `pnpm db:migrate && pnpm db:seed` |
| Parser unavailable         | Start parser; set `OPENAI_API_KEY`                                                           |
| Bot silent                 | Set token and allowlist; start API and parser first                                          |
| Worker exits               | Run `pnpm infra:up`; verify `REDIS_URL`                                                      |
| Docker parser/bot inactive | Export `TRACKX_*` secrets before `pnpm stack:up`                                             |
| Prisma directUrl error     | Add `DIRECT_URL` to `.env` or use the local `pnpm db:*` wrapper scripts                      |

More detail lives in the README troubleshooting section.
