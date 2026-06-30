# Apple Wallet Shortcut Import

TrackX can receive iOS Shortcuts Wallet transaction automation events through a
same-origin web API route.

## Flow

```text
iPhone Wallet automation
  -> TrackX web API
  -> parser and transaction storage
  -> dashboard, budgets, and unified logs
```

The endpoint is:

```text
POST /api/imports/apple-wallet
```

In production, use the full Vercel URL:

```text
https://track-x-web-two.vercel.app/api/imports/apple-wallet
```

## Token

Create the token from the TrackX Settings page.

- The raw token is shown once.
- Store it only in the iOS Shortcut.
- The database stores only a SHA-256 hash and a short preview.
- Rotating the token revokes the old active token.

Use the copied value as the `Authorization` header:

```text
Authorization: Bearer txs_...
```

## Shortcut Request

In Shortcuts, use **Get Contents of URL**.

Set:

- Method: `POST`
- Request Body: `JSON`

Headers:

| Key           | Value               |
| ------------- | ------------------- |
| Content-Type  | application/json    |
| Authorization | Bearer copied-token |

Request body fields:

| Key      | Value                              |
| -------- | ---------------------------------- |
| source   | apple_wallet                       |
| merchant | Shortcut Input -> Merchant         |
| amount   | Shortcut Input -> Amount           |
| card     | Shortcut Input -> Card or Pass     |
| name     | Shortcut Input -> Name             |
| currency | USD, EUR, or ILS when amount lacks |

If the Wallet amount includes a symbol like `$4.56`, TrackX infers the currency.
If Shortcuts sends only `4.56`, add `currency` explicitly.

## Logging

The route writes lifecycle events to `message_events`:

- `apple_wallet_import_received`
- `message_user_resolved`
- `parser_started`
- `transactions_created` or `parser_clarification`
- `apple_wallet_import_completed`

Live local logs can be tailed with:

```bash
pnpm logs:live
```
