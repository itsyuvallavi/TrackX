# TrackX Platform Stack

This document records the **target cloud platform** for TrackX after the local MVP: which services we use, why we chose them, how they connect, and what we intentionally deferred.

It complements [architecture.md](./architecture.md) (repo structure) and [local-development.md](./local-development.md) (local commands).

## Summary

TrackX is built as a **microservices monorepo in code**, with a **pragmatic split in production** to keep cost near zero for personal use.

| Platform               | Role                                                            |
| ---------------------- | --------------------------------------------------------------- |
| **Vercel**             | Web dashboard and API hub                                       |
| **Supabase**           | Postgres database                                               |
| **Cloudflare Workers** | Telegram webhook (message-triggered, not 24/7)                  |
| **OpenAI**             | Natural-language parsing (called by the parser through the API) |

**Core idea:** the **API is the hub**. Telegram and the web dashboard are entry points. The parser and OpenAI are helpers. Only the API should talk to Supabase directly.

We are **not** running a 24/7 AWS stack (~$30–80/month) for a personal expense tracker. AWS remains a valid **future scale path**, documented as an alternative rather than the current default.

---

## Design principles

1. **API as hub** — all business logic and database access flows through the API.
2. **Message-triggered Telegram** — use Cloudflare webhooks, not always-on polling, in production.
3. **Microservices in the repo, pragmatic deploy** — keep service boundaries in git; combine hosts where it saves cost without lying about the design.
4. **Secrets per platform** — local `.env`, Vercel env vars, Cloudflare Wrangler secrets, Supabase connection strings; never commit secrets.
5. **Personal-scale first** — optimize for ~$0–10/month before optimizing for enterprise topology.

---

## The hub: API

### What it is

The **API** is not “API management” (not AWS API Gateway). It is **your backend application**.

Production target:

- `apps/web/src/app/api/.../route.ts` — Next.js Route Handlers on Vercel.

Current implementation:

- `apps/web/src/app/api/.../route.ts` — same-origin Next.js Route Handlers for Vercel.
- `services/api` — Fastify service used by the local MVP and Docker stack.
- `packages/api-core` — route-independent API logic shared by the Fastify adapter and Vercel Route Handlers.

It owns:

- Transaction CRUD
- Budget and dashboard read endpoints
- `POST /transactions/from-message` (orchestrates edit intent, parser, and DB)
- Parse event storage
- Undo, budget status, month/week summaries

### Why Vercel for the API

- Same platform as the Next.js dashboard
- Can use same origin (`/api/...`) — no CORS, simpler `WEB_API_BASE_URL`
- Works well with Supabase when using the **connection pooler** URL
- Serverless fits request/response traffic (web + Telegram webhook calls)
- Strong portfolio story without AWS monthly burn

### How other components use it

| Caller               | Calls API for                                                           |
| -------------------- | ----------------------------------------------------------------------- |
| Cloudflare webhook   | `POST /transactions/from-message`, `/undo`, budgets, dashboard          |
| Vercel web dashboard | `GET /dashboard/*`, `GET /transactions`, `PATCH`/`DELETE`               |
| Parser               | Local API calls parser service; Vercel API calls parser-core in-process |

### Keys on Vercel

Set in **Vercel → Project → Environment Variables** (or `vercel env`), not committed to git:

| Variable           | Purpose                                            |
| ------------------ | -------------------------------------------------- |
| `DATABASE_URL`     | Supabase Postgres (**pooler** URL for serverless)  |
| `OPENAI_API_KEY`   | Parser and API edit-intent OpenAI calls            |
| `OPENAI_MODEL`     | Parser and intent model, defaults to `gpt-4o-mini` |
| `DEFAULT_TIMEZONE` | Default user timezone                              |
| `DEFAULT_CURRENCY` | Default currency                                   |

Local development uses the same names in root `.env`.

---

## Web dashboard — Vercel

### Repo location

`apps/web` — Next.js App Router.

### What it does

- Monthly/weekly summaries, budget progress, recent transactions
- Full transactions list with edit/delete (server actions)
- Root `/` redirects to `/dashboard`

### Why Vercel

- Built for Next.js (SSR, server actions, deploy previews)
- Free hobby tier is enough for personal use
- Keeps UI and API on one platform if API routes live in the same project

The Vercel project settings should point at the monorepo web app:

- Framework: Next.js
- Root Directory: `apps/web`
- Build command/output directory: Vercel defaults for Next.js

`apps/web/next.config.ts` traces from the monorepo root and includes Prisma client files plus `pg` / `@prisma/adapter-pg` for the Supabase pooler driver path. Without that, Vercel can build successfully but DB-backed API routes fail at runtime with 500/503 errors.

### How it talks to the backend

Current implementation uses server-side fetch through the web app:

- Local default: same-origin `/api` on `http://localhost:3000`
- Local Docker/Fastify override: set `WEB_API_BASE_URL` to `http://localhost:4001` or `http://api:4001`
- Vercel default: leave `WEB_API_BASE_URL` unset; dashboard fetches use the incoming request host so alias/custom domains work with Deployment Protection

The web app uses Supabase directly only for Auth session cookies. Business data
still flows through the API and Prisma.
Operational Telegram/API traces are written to the API-only `message_events`
table so Cloudflare and Vercel events can be joined by correlation ID. Use
`pnpm logs:live` to watch those events in one terminal stream.

If `BETTER_STACK_SOURCE_TOKEN` and `BETTER_STACK_INGESTING_HOST` are present,
Vercel also exports a sanitized operational subset to Better Stack after the
request. Supabase stays the durable audit source and retains the full event.
The hosted copy excludes user and Telegram identifiers plus raw message and
reply previews. Better Stack delivery is best effort and cannot make an
expense, reply, or database write fail. The Cloudflare Worker sends the same
sanitized direct fallback only when its protected Vercel event write fails,
avoiding duplicate hosted logs during the normal path.

The
[TrackX Operations dashboard](https://telemetry.betterstack.com/team/t568293/dashboards/1070531)
is the central hosted operational view. Its Health, Latency, Diagnostics, and
Alerts sections use labels extracted from new events (`service_name`,
`event_type`, `status`, `delivery`, and `environment`) plus the `elapsed_ms`
metric. Existing history is not backfilled. Enabled email alerts cover any
failed event, any fallback delivery, and Apple Wallet imports exceeding 15
seconds. Supabase `message_events` remains the complete audit and
reconciliation source.

Vercel and Cloudflare native runtime logs are the fallback when either durable
event persistence or hosted export fails. Failure-only entries are emitted as
single-line JSON with `service`, `correlationId`, `failedEventType`, and a
secret-redacted `errorMessage`; they never include transaction text or user and
Telegram identifiers. Use the correlation ID to reconcile a native failure
against Supabase or Better Stack. Native retention is platform-plan dependent,
so it is a diagnostic fallback rather than the audit source.

Search Vercel runtime logs for `message_event_persistence_failed` or
`message_event_export_failed`. Search Cloudflare Workers Logs for
`system_event_write_failed`, `better_stack_fallback_failed`, or
`telegram_webhook_failed`. A successful normal request does not emit these
native fallback entries.

### Production trace verification

Use one synthetic correlation ID to verify the complete observability path:

1. Send a protected `telemetry_smoke_test` event to the production
   `/api/system-events` route with `x-trackx-api-secret`.
2. Confirm the same correlation ID appears in Supabase `message_events`.
3. Confirm it appears in the Better Stack live tail and TrackX Operations
   dashboard without raw message or user identifiers.
4. Confirm Vercel has no matching `message_event_persistence_failed` or
   `message_event_export_failed` entry.
5. For Telegram failures, search Cloudflare by the same correlation ID before
   changing application code.

The smoke event must contain synthetic metadata only. Never paste production
tokens, Telegram identifiers, transaction text, or user data into a test event.

### Keys

| Variable                               | Where                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------- |
| `WEB_API_BASE_URL`                     | Optional local/Docker override; leave unset on Vercel for same-host `/api` |
| `NEXT_PUBLIC_SITE_URL`                 | Public app URL used by Supabase email redirects                            |
| `NEXT_PUBLIC_SUPABASE_URL`             | Supabase project URL for Auth                                              |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable/anon key for Auth sessions                            |
| `BETTER_STACK_SOURCE_TOKEN`            | Server-only Better Stack telemetry source token                            |
| `BETTER_STACK_INGESTING_HOST`          | Server-only Better Stack telemetry ingest host                             |

---

## Database — Supabase

### Repo location

`packages/db` — Prisma schema, migrations, seed.

### What it does

Source of truth for:

- Users, categories, transactions, budgets, parse events
- One-time Telegram account link codes
- API-only message lifecycle events for production traceability
- Hosted Auth identities, mapped one-to-one into application `users`

### Why Supabase

- Managed Postgres with a generous free tier
- Works with existing Prisma setup (`DATABASE_URL` plus Prisma `DIRECT_URL`)
- No need to run Postgres in Docker in production

### Who talks to it

**Only the API** (through Prisma). Not Cloudflare, not the web app directly.
Public table RLS is enabled in hosted Supabase and public table grants are
revoked from `anon` and `authenticated`. Each public table also has an explicit
`api_only_no_public_access` deny policy for those roles, so the API remains the
database boundary.

Telegram linking follows the same rule. Link codes live in Postgres as hashed,
short-lived records and are consumed through server-side API code. The raw code
is only shown once to the signed-in user.

### Keys

| Variable       | Where                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------- |
| `DATABASE_URL` | Vercel env — use Supabase **transaction pooler** URL for serverless runtime queries                 |
| `DIRECT_URL`   | Vercel env and local shell for Prisma migrations — use Supabase session/direct-style connection URL |

For Prisma with Vercel/serverless, keep runtime queries on the Supabase
transaction pooler. Use `DIRECT_URL` for migration commands so Prisma can run
schema changes without transaction-pooler limitations.

Initial hosted setup:

```bash
pnpm env:check -- --target=vercel
pnpm db:migrate:status
pnpm db:migrate:deploy
pnpm db:seed
```

---

## Telegram — Cloudflare Workers

### Repo location

`apps/webhook` — Cloudflare Worker with Wrangler.

Local alternative: `apps/bot` (polling) for development only.

### What it does

1. Receives Telegram webhook POST when **you** send a message
2. Checks allowlist
3. Calls TrackX API (same commands as `apps/bot`)
4. Sends reply via Telegram `sendMessage`

### Why Cloudflare (not always-on server)

- **Webhook = triggered per message** — no 24/7 polling loop
- Free tier suitable for personal bot traffic
- Bot token stays on Cloudflare; Vercel API does not need `TELEGRAM_BOT_TOKEN` in Path 1
- Fits the stack: CF for edge/Telegram, Vercel for app logic

### Why not polling in production

Polling (`apps/bot`) asks Telegram “any messages?” in a loop forever. That requires an always-on process (Fly, VPS, laptop). Webhooks match “run when I message.”

### Production flow (Path 1)

```text
You → Telegram → Cloudflare Worker → Vercel API → parser/OpenAI → Supabase
                                      ← reply text ←
                Cloudflare → Telegram (you see reply)
```

### Keys on Cloudflare

Set with `wrangler secret put` or Cloudflare dashboard. Local dev uses `apps/webhook/.dev.vars` (from `.dev.vars.example`):

| Variable                      | Purpose                                |
| ----------------------------- | -------------------------------------- |
| `TELEGRAM_BOT_TOKEN`          | From BotFather                         |
| `API_BASE_URL`                | Public Vercel API base URL             |
| `TRACKX_API_SECRET`           | Shared Cloudflare-to-Vercel API secret |
| `TELEGRAM_WEBHOOK_SECRET`     | Optional webhook verification          |
| `BETTER_STACK_SOURCE_TOKEN`   | Optional Better Stack source token     |
| `BETTER_STACK_INGESTING_HOST` | Optional Better Stack ingest host      |
| `DEFAULT_TIMEZONE`            | In `wrangler.toml` [vars]              |
| `DEFAULT_CURRENCY`            | In `wrangler.toml` [vars]              |

Setup details: [cloudflare-webhook.md](./cloudflare-webhook.md).

---

## Parser and OpenAI

### Repo location today

`packages/parser-core` — OpenAI structured-output parser, prompt, normalization, and eval cases.

`services/parser` — local Fastify HTTP adapter around `@trackx/parser-core`.

### What the parser does (simple)

Turns human text into structured data:

```text
"spent 15 eur on food"  →  amount, currency, category, type, description
```

**OpenAI is the external AI service. The parser is your code that calls OpenAI** and validates the result with Zod schemas from `@trackx/shared`.

The parser does **not** save to the database or reply on Telegram.

### Target placement

| Phase              | Parser lives                                | Why                                                |
| ------------------ | ------------------------------------------- | -------------------------------------------------- |
| **Local/Docker**   | `services/parser` HTTP service              | Keeps service split visible for learning           |
| **Vercel target**  | `@trackx/parser-core` inside API deployment | One hop, one cold start, OpenAI key only on Vercel |
| **Optional split** | Cloudflare Worker                           | Stateless, good for resume; extra network hop      |

**Recommendation:** keep parser-core inside the Vercel API; extract to a Cloudflare Worker only if you want a visible split on the diagram.

### Keys

| Variable         | Where                                        |
| ---------------- | -------------------------------------------- |
| `OPENAI_API_KEY` | Vercel env (and local `.env`)                |
| `OPENAI_MODEL`   | Vercel env (optional, default `gpt-4o-mini`) |

---

## Scheduled work — Vercel Cron (deferred)

### Repo location

`services/worker` exists as a local BullMQ experiment, but it is **not** the production default.

### Production direction

If TrackX adds scheduled summaries later, use Vercel Cron calling short HTTP routes such as:

```text
GET /api/cron/weekly-summary
GET /api/cron/monthly-summary
```

That route calculates the summary, sends a Telegram message through the chosen Telegram sender, and exits.

### Why not Redis/BullMQ in production now

- No auto-imports or continuous sync are planned.
- No high-volume background queue exists.
- Vercel Cron is enough for personal scheduled summaries.
- Avoids a 24/7 worker host and avoids production Redis cost/ops.

### Current local status

The local `services/worker` placeholder can stay for learning Docker/queues, but production deployment should ignore it until a real always-on queue requirement exists.

### Future Vercel Cron flow

```text
Vercel Cron
  → /api/cron/weekly-summary
  → read Supabase through API/domain logic
  → send Telegram summary
  → exit
```

### Keys (when enabled)

| Variable      | Where                            |
| ------------- | -------------------------------- |
| `CRON_SECRET` | Vercel env, optional route guard |

---

## Monorepo map: code vs cloud

| Repo path              | Local role                | Production host                              |
| ---------------------- | ------------------------- | -------------------------------------------- |
| `apps/web`             | Dashboard                 | **Vercel**                                   |
| `apps/webhook`         | Telegram webhook          | **Cloudflare Workers**                       |
| `apps/bot`             | Telegram polling          | **Local dev only** (not prod)                |
| `apps/web/src/app/api` | API hub                   | **Vercel**                                   |
| `services/api`         | Fastify API               | Local/Docker compatibility path              |
| `services/parser`      | Parser HTTP adapter       | Local/Docker compatibility path              |
| `packages/parser-core` | OpenAI parsing            | Bundled into Vercel API routes               |
| `services/worker`      | BullMQ worker placeholder | Local experiment only, not prod              |
| `packages/api-core`    | API domain logic          | Bundled into local API and Vercel API routes |
| `packages/db`          | Prisma / schema           | Migrations against **Supabase**              |
| `packages/shared`      | Shared types/schemas      | Bundled into all deploys                     |
| `packages/config`      | Env parsing               | Used by Node services locally                |

Docker Compose remains the **local** way to run Postgres + Redis + all services together. Production replaces Postgres with Supabase and does not require Redis, BullMQ, or five separate paid hosts.

---

## End-to-end flows

### Telegram expense (production target)

```text
1. You send: "spent 15 eur on food"
2. Telegram POSTs to Cloudflare Worker
3. Worker calls Vercel API: POST /transactions/from-message
4. API calls parser logic → OpenAI
5. API saves transaction to Supabase
6. API returns feedback text
7. Worker calls Telegram sendMessage
8. You see reply in Telegram (seconds later)

Dashboard: open Vercel web app anytime → reads same data via API
```

### Dashboard review

```text
Browser → Vercel (apps/web) → Vercel API → Supabase
         ← HTML / server actions ←
```

Edit/delete: server actions → `PATCH`/`DELETE` on API → Supabase → revalidate pages.

---

## Where secrets live

| Environment    | Storage                                          |
| -------------- | ------------------------------------------------ |
| **Local**      | Root `.env` (never commit)                       |
| **Vercel**     | Project Environment Variables                    |
| **Cloudflare** | Wrangler secrets + `.dev.vars` locally           |
| **Supabase**   | Dashboard → connection string → copy into Vercel |
| **OpenAI**     | Platform.openai.com → key → Vercel               |

Never commit: `.env`, `.dev.vars`, tokens, database passwords.

---

## What we chose not to do (and why)

| Option                          | Why not (for now)                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------------- |
| **AWS ECS + RDS 24/7**          | ~$30–80+/month for personal use; valid scale path later                                   |
| **Telegram polling in prod**    | Requires always-on server; webhooks are cheaper and simpler                               |
| **Vercel-only for Telegram**    | Possible with webhooks on Vercel; we prefer CF for Telegram interface and token isolation |
| **Web → Supabase direct**       | Breaks hub model; duplicates logic and security boundaries                                |
| **Five separate paid hosts**    | Unnecessary cost; API+parser can share Vercel                                             |
| **Redis/BullMQ in production**  | No queue workload yet; Vercel Cron is enough for scheduled summaries                      |
| **Live worker cron on day one** | No user value yet                                                                         |
| **Bank integrations, Sentry**   | Post-MVP                                                                                  |

---

## AWS and microservices (portfolio story)

The repo **already demonstrates microservices**:

- Separate packages and services in git
- Docker Compose locally
- Clear boundaries (API, parser, bot, web, worker)
- Shared Zod contracts

Production uses a **cost-aware deploy** without deleting that design.

**Resume-friendly framing:**

> Built a microservices monorepo with Docker and shared contracts. Deployed the dashboard and API on Vercel, Postgres on Supabase, and Telegram webhooks on Cloudflare. Documented an AWS ECS/RDS target architecture for scale.

Optional later: Terraform for AWS, ephemeral staging deploy, tear down when done (~few dollars per session).

---

## Local development vs production

| Concern  | Local                                             | Production (target)                 |
| -------- | ------------------------------------------------- | ----------------------------------- |
| Database | Docker Postgres                                   | Supabase                            |
| Redis    | Docker Redis for local worker experiments         | None by default                     |
| API      | `pnpm api:dev` :4001                              | `apps/web` Route Handlers on Vercel |
| Parser   | `pnpm parser:dev` :4002                           | Inside Vercel API                   |
| Web      | `pnpm web:dev` :3000                              | Vercel                              |
| Auth     | Supabase Auth with local callback URL             | Supabase Auth with Vercel callback  |
| Telegram | `apps/bot` polling **or** `apps/webhook` + tunnel | Cloudflare Worker                   |
| Worker   | `pnpm worker:dev` for local BullMQ learning       | Deferred / no prod worker           |

Quick local path: [local-development.md](./local-development.md).

---

## Implementation order (recommended)

1. **Supabase** — create project, run Prisma migrate/seed, set `DATABASE_URL` and `DIRECT_URL` on Vercel
2. **Vercel API migration** — route handlers exist under `apps/web/src/app/api` and parser-core is colocated
3. **Parser** — parser-core is colocated inside Vercel API routes
4. **Vercel web** — deploy `apps/web`; use same-origin `/api/...`
5. **Supabase Auth** — email/password login protects the dashboard and protected web API routes
6. **Cloudflare** — deploy `apps/webhook`, set secrets, register Telegram webhook
7. **Vercel Cron** — add only if scheduled summaries become useful

---

## Related docs

| Doc                                              | Contents                                 |
| ------------------------------------------------ | ---------------------------------------- |
| [architecture.md](./architecture.md)             | Repo service map and local flows         |
| [cloudflare-webhook.md](./cloudflare-webhook.md) | Wrangler, secrets, webhook registration  |
| [telegram-setup.md](./telegram-setup.md)         | BotFather, allowlist, polling vs webhook |
| [local-development.md](./local-development.md)   | Fresh install, Docker, commands          |
| [PLAN.md](../PLAN.md)                            | Implementation slice history             |

---

## Glossary

| Term        | Meaning in TrackX                                    |
| ----------- | ---------------------------------------------------- |
| **API**     | Your backend hub (`services/api`), not API Gateway   |
| **Parser**  | Code that calls OpenAI to structure finance messages |
| **Webhook** | Telegram pushes each message to your HTTPS URL       |
| **Polling** | Bot repeatedly asks Telegram for updates (local dev) |
| **Hub**     | API — everything important routes through it         |
