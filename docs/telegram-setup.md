# Telegram Setup

TrackX uses Telegram as the primary MVP input surface. See [architecture.md](./architecture.md) for the full message flow.

You can receive messages in two ways:

| Mode    | App                          | Best for                        |
| ------- | ---------------------------- | ------------------------------- |
| Webhook | `apps/webhook` on Cloudflare | Cloud deploy, message-triggered |
| Polling | `apps/bot`                   | Local development               |

Cloudflare webhook setup lives in [cloudflare-webhook.md](./cloudflare-webhook.md).

## Create A Bot

1. Open Telegram.
2. Start a chat with `@BotFather`.
3. Send `/newbot`.
4. Choose a display name, for example `SpendPilot`.
5. Choose a username ending in `bot`, for example `spendpilot_dev_bot`.
6. Copy the token into `.env` as `TELEGRAM_BOT_TOKEN`.

Never commit the token.

## Allow Your User

Add your numeric Telegram user id to `.env`.

```bash
TELEGRAM_ALLOWED_USER_IDS="123456789"
```

Multiple users can be comma-separated.

```bash
TELEGRAM_ALLOWED_USER_IDS="123456789,987654321"
```

If the allowlist is empty, the bot denies everyone.

## Local Development

Run the API and parser first, then start the bot.

```bash
pnpm api:dev
pnpm parser:dev
pnpm bot:dev
```

Then send a normal message to the bot.

```text
spent 15 eur on food
```

The bot forwards text and the Telegram user id to
`POST /transactions/from-message`, then replies with the API feedback.

If the parser asks for one missing detail, the API stores the original message
as a pending clarification in Postgres. The next non-command message from the
same Telegram user is parsed as the clarification answer, so a flow like
`0.89 for garlic` then `euro` can complete one transaction. Pending
clarifications are resolved on success and expire after a short window.

Use `/category last <category>` to move the latest Telegram transaction to a
different category. Category aliases such as `fun`, `groceries`, and
`subscriptions` are accepted.

You can also use normal chat for recent category corrections, for example
`move the movie to fun`. The API asks OpenAI for a structured edit intent, then
validates the recent transaction id and category before updating Postgres. If
the message is ambiguous, the bot asks one clarifying question instead.

## Docker Stack

For Docker, export secret values in the shell before starting the stack.

```bash
export TRACKX_OPENAI_API_KEY="your-openai-key"
export TRACKX_TELEGRAM_BOT_TOKEN="your-telegram-token"
export TRACKX_TELEGRAM_ALLOWED_USER_IDS="123456789"
pnpm stack:up
```

The Compose file intentionally does not load `.env` directly, so `pnpm stack:config` does not print real secrets.
