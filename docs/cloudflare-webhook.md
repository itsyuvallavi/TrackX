# Cloudflare Telegram Webhook

TrackX can receive Telegram messages through a Cloudflare Worker instead of the always-on polling bot.

## Flow

```text
Telegram message
  -> Cloudflare Worker (apps/webhook)
  -> TrackX API (/api/... on Vercel, or local API routes when configured)
  -> parser/OpenAI + Supabase (through the API)
  -> Cloudflare Worker replies via Telegram sendMessage
```

The worker keeps the **Telegram bot token** on Cloudflare. The API stays focused on parsing, persistence, and budgets.

## Local development

1. Start the API (and parser if you use live OpenAI parsing):

```bash
pnpm infra:up
pnpm api:dev
pnpm parser:dev
```

2. Install worker dependencies from the repo root:

```bash
pnpm install
```

3. Create a worker secrets file for local dev. Wrangler reads `.dev.vars`:

```bash
cat > apps/webhook/.dev.vars <<'EOF'
TELEGRAM_BOT_TOKEN=your-token
API_BASE_URL=http://localhost:3000/api
TRACKX_API_SECRET=local-shared-secret
TELEGRAM_WEBHOOK_SECRET=optional-local-secret
EOF
```

4. Start the worker:

```bash
pnpm webhook:dev
```

5. Expose the local worker URL to Telegram with a tunnel (example using cloudflared):

```bash
cloudflared tunnel --url http://127.0.0.1:8787
```

6. Register the webhook with Telegram:

```bash
curl -X POST "https://api.telegram.org/bot<token>/setWebhook" \
  -H 'content-type: application/json' \
  -d '{"url":"https://<public-url>","secret_token":"optional-local-secret"}'
```

Send a Telegram message and confirm the worker log shows the request and the bot replies.

## Production deploy

From the repo root:

```bash
pnpm --filter @trackx/webhook deploy
```

The worker is configured with `workers_dev = true`, so deploys should publish a public URL like:

```text
https://trackx-webhook.<your-workers-subdomain>.workers.dev
```

Set secrets in Cloudflare:

```bash
pnpm env:check -- --target=cloudflare
cd apps/webhook
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put API_BASE_URL
wrangler secret put TRACKX_API_SECRET
wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

Point `API_BASE_URL` at your public API host. In production it should be the
Vercel API base, for example `https://track-x-web-two.vercel.app/api`, so the
webhook can call `/telegram/link` and the same-origin transaction routes.

`/start`, `/help`, and `/link CODE` are public. Normal messages are accepted by
the webhook but must resolve to a linked Telegram account in the Vercel API
before any data is read or written. Unlinked users get setup guidance.

Register the production worker URL with Telegram using the same `setWebhook` call.

## Polling bot vs webhook worker

| Mode    | App            | When to use                                   |
| ------- | -------------- | --------------------------------------------- |
| Polling | `apps/bot`     | Simple local MVP, laptop must stay on         |
| Webhook | `apps/webhook` | Cloud deploy, triggered only when you message |

You do not need both in production. Pick one receiver for Telegram.

## Environment variables

| Variable                    | Purpose                                        |
| --------------------------- | ---------------------------------------------- |
| `TELEGRAM_BOT_TOKEN`        | Bot token from BotFather                       |
| `API_BASE_URL`              | Public or tunneled TrackX API base URL         |
| `TRACKX_API_SECRET`         | Shared secret for Cloudflare-to-Vercel API     |
| `DEFAULT_TIMEZONE`          | Default timezone for parsing                   |
| `DEFAULT_CURRENCY`          | Default currency for parsing                   |
| `TELEGRAM_WEBHOOK_SECRET`   | Optional shared secret validated from Telegram |

## Health check

```bash
curl https://<your-worker>.workers.dev
```

Expected response:

```text
TrackX Telegram webhook is running.
```
