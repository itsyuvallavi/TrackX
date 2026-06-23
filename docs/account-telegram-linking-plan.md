# Account And Telegram Linking Plan

Owner: docs. Planning doc for self-serve TrackX account onboarding and Telegram linking.

Status: in progress. Slice 1, Slice 2, Slice 3, Slice 4, and Slice 5 have been implemented locally; later slices are still proposed. Do not implement this as one large change. Execute one slice at a time and stop at each gate for review.

## Goal

Make TrackX self-serve for a real user:

1. A user creates a web account.
2. The user signs in to the dashboard.
3. The user connects their Telegram account from Settings.
4. The user sends normal expense or income messages to the bot.
5. The bot logs entries only into that user's account.
6. The dashboard shows only that user's data.

The current product already has the core pieces, but the connection between a signed-in web account and a Telegram user is still manual. This plan turns that into a secure user flow.

## Current Inspection Findings

- Supabase email/password auth already exists on `/login`.
- Protected dashboard routes already require a Supabase session.
- The API maps Supabase auth users into application `users` rows.
- The database already has `users.telegramUserId`.
- Telegram-backed API routes already require the shared `TRACKX_API_SECRET`.
- Telegram-backed API routes can resolve a user by `telegramUserId`.
- The Cloudflare webhook still gates Telegram users through `TELEGRAM_ALLOWED_USER_IDS`.
- The Settings page explains Telegram, but does not provide a real linking flow.
- The current `ensureTelegramUser` behavior can attach an unknown Telegram ID to the default local user, which is not acceptable for multi-user onboarding.

## Current Behavior Map

### What Works Today

- A user can create an email/password account.
- A user can confirm email through Supabase.
- A user can sign in.
- `/dashboard`, `/transactions`, and `/settings` are protected.
- A linked Telegram ID can create transactions through the webhook/API path.
- Budget defaults are created for new auth users.
- Telegram messages can parse expenses and income, including foreign currency conversion.

### What Is Missing

- No self-serve way to connect Telegram from the web app.
- No one-time link code model.
- No `/link <code>` bot command.
- No clear "connected/not connected" status in Settings.
- No secure unlink/relink path.
- New Telegram users are blocked by the allowlist before they can link.
- The default-user fallback is still too permissive for a multi-user product.

### Target Behavior

- New user signs up in the web app.
- After account creation, the app guides them to Settings.
- Settings shows Telegram as "not connected".
- User clicks "Create link code".
- App shows a short command, for example `/link A7K92Q`.
- User sends that command to the Telegram bot.
- The bot validates the code and stores the Telegram user ID on that web account.
- The bot replies with a short success message.
- Future Telegram messages from that Telegram user log transactions to that account.
- Unknown Telegram users are told to connect their account first.

## Security Model

- Supabase Auth owns web identity.
- Prisma/API owns business data access.
- Telegram linking must be explicit and user-initiated from an authenticated web session.
- Telegram link codes must be random, short-lived, single-use, and stored hashed.
- A Telegram ID can belong to only one TrackX user.
- A TrackX user can have at most one Telegram ID in the first version.
- Telegram messages from unlinked users must not create accounts or transactions.
- The Cloudflare webhook may still use `TRACKX_API_SECRET` to authenticate server-to-server calls.
- `TELEGRAM_ALLOWED_USER_IDS` should become optional emergency/admin restriction, not the primary onboarding mechanism.

## Slice 1: Account Onboarding Cleanup

Status: implemented locally. Focused web checks passed; awaiting review.

### Objective

Make the existing account creation flow understandable before adding Telegram linking.

### Inspect

- Review `/login` copy, signup behavior, and redirect behavior.
- Review `/auth/callback`.
- Review middleware protection for `/dashboard`, `/transactions`, and `/settings`.
- Confirm new Supabase users are created in application `users` when protected pages are loaded.

### Map

Current:

- The page offers sign in and create account in one form.
- Signup redirects back to `/login` with a "Check your email" message.
- The dashboard is the default destination.

Target:

- The user understands whether they are signing in or creating an account.
- After account creation or first login, the user is guided toward Settings to connect Telegram.
- Existing users can still go straight to the dashboard.

### Plan

Files likely edited:

- `apps/web/src/app/login/page.tsx`
- `apps/web/src/app/auth/callback/route.ts`
- `apps/web/src/lib/auth.ts`
- `README.md`
- `docs/platform-stack.md`

Implementation steps:

1. Clarify login page copy around account creation.
2. Preserve email/password Supabase Auth.
3. Keep `/login?next=...` behavior for protected-route redirects.
4. Consider redirecting successful auth callback to `/settings` when there is no explicit `next`.
5. Update docs to describe the intended onboarding entrypoint.

### Pre-Mortem

- Risk: existing users get forced into Settings every time.
  - Mitigation: only route new/confirmation flows to Settings; preserve explicit `next`.
- Risk: Supabase callback redirect breaks production URL.
  - Mitigation: continue using `NEXT_PUBLIC_SITE_URL` and existing callback route.
- Risk: wording suggests Telegram is required before dashboard access.
  - Mitigation: say Telegram is recommended for logging, not required for viewing.

### Verify

- `pnpm --filter @trackx/web typecheck`
- Manual local route check:
  - `/login`
  - `/dashboard` while signed out redirects to `/login`
  - login redirects to the intended destination
- Production smoke after deploy when this slice is accepted.

### Gate

Stop after the login/onboarding copy and redirect behavior are reviewed.

## Slice 2: Telegram Link Data Model

Status: implemented locally. Prisma schema validation and API-core checks passed. Local database migration application is pending because Docker/Postgres was unavailable in this run.

### Objective

Add the database and API-core foundation for secure one-time Telegram linking.

### Inspect

- Review `packages/db/prisma/schema.prisma`.
- Review current `User` model and `telegramUserId` uniqueness.
- Review `packages/api-core/src/repositories/users.ts`.
- Review current Prisma migrations.
- Review hosted Supabase schema before applying migration.

### Map

Current:

- `User.telegramUserId` exists.
- No link-code table exists.
- Unknown Telegram users can still be attached through default-user fallback in some paths.

Target:

- Link codes are represented as their own table.
- Codes are short-lived and single-use.
- The raw code is never stored.
- Linking updates `users.telegramUserId` only after code validation.

### Plan

Files likely edited or added:

- `packages/db/prisma/schema.prisma`
- `packages/db/prisma/migrations/<timestamp>_add_telegram_link_codes/migration.sql`
- `packages/api-core/src/repositories/telegram-link-codes.ts`
- `packages/api-core/src/services/telegram-link-service.ts`
- `packages/api-core/src/__tests__/telegram-link-service.test.ts`
- `packages/api-core/src/index.ts`
- `README.md`
- `docs/telegram-setup.md`

Data model:

- `TelegramLinkCode`
  - `id uuid`
  - `userId uuid`
  - `codeHash text`
  - `expiresAt timestamp`
  - `consumedAt timestamp?`
  - `telegramUserId text?`
  - `createdAt timestamp`
  - `updatedAt timestamp`

Indexes and constraints:

- Index active lookups by `codeHash`.
- Index by `userId`.
- Keep `users.telegramUserId` unique.
- Add foreign key to `users.id`.

Service behavior:

1. Generate a random code.
2. Hash the code before storage.
3. Expire previous active codes for the same user.
4. Validate code by hash.
5. Reject expired or consumed codes.
6. Link the Telegram user ID inside a transaction.
7. Mark the code consumed.

### Pre-Mortem

- Risk: code brute-force.
  - Mitigation: use enough entropy, short expiry, one-time use, generic failure messages.
- Risk: duplicate Telegram linking.
  - Mitigation: rely on unique `users.telegramUserId` and return a clear conflict error.
- Risk: stale codes remain usable.
  - Mitigation: check both `expiresAt` and `consumedAt`.
- Risk: plain text code leaks in DB.
  - Mitigation: store only `codeHash`.

### Verify

- `pnpm --filter @trackx/db prisma:local validate`
- `pnpm --filter @trackx/api-core test`
- `pnpm --filter @trackx/api-core typecheck`
- Local SQL check confirms table and indexes exist.
- Hosted Supabase migration status check when ready for production.

### Gate

Stop after the model and service tests pass. Do not add UI or bot behavior in this slice.

## Slice 3: Settings Telegram Link UI

Status: implemented locally. Awaiting focused verification and review. Runtime code generation requires the Slice 2 database migration to be applied first.

### Objective

Let a signed-in user generate a Telegram link command from Settings.

### Inspect

- Review `apps/web/src/app/settings/page.tsx`.
- Review current settings components.
- Review authenticated API route patterns.
- Review current web design system.

### Map

Current:

- Settings includes budget planning and a static Telegram explanation.

Target:

- Settings shows Telegram connection state.
- If unlinked, user can generate a one-time code.
- If linked, user sees connected state.
- The UI is simple, mobile-friendly, and does not expose internal technical details.

### Plan

Files likely edited or added:

- `apps/web/src/app/settings/page.tsx`
- `apps/web/src/components/settings/telegram-link-panel.tsx`
- `apps/web/src/app/api/telegram/link-code/route.ts`
- `apps/web/src/app/api/telegram/status/route.ts`
- `apps/web/src/lib/api-route-runtime.ts`
- `apps/web/src/lib/server-page-data.ts`
- `README.md`
- `docs/telegram-setup.md`

UI states:

- Not connected:
  - "Connect Telegram"
  - "Send this command to the bot"
  - `/link ABC123`
  - "Copy"
  - "Open Telegram"
- Code expired:
  - "Code expired. Create a new one."
- Connected:
  - "Telegram connected"
  - Show safe identifier only, for example last digits of Telegram ID.
- Error:
  - "Could not create link code. Try again."

API behavior:

- `GET /api/telegram/status`
  - Requires web auth.
  - Returns connected state.
- `POST /api/telegram/link-code`
  - Requires web auth.
  - Generates a one-time code.
  - Returns raw code only once in the response.

### Pre-Mortem

- Risk: code displayed after refresh.
  - Mitigation: raw code is only returned on generation; user can generate a new one.
- Risk: confusing Telegram copy.
  - Mitigation: show exactly one command to send.
- Risk: layout becomes too busy.
  - Mitigation: keep the Telegram panel short and task-focused.
- Risk: code leaks into logs.
  - Mitigation: do not log raw codes server-side.

### Verify

- `pnpm --filter @trackx/web typecheck`
- `pnpm --filter @trackx/web test`
- Browser smoke on `/settings`.
- Generate code while signed in.
- Confirm signed-out calls return unauthorized.

### Gate

Stop after the Settings UI can generate a code. Do not wire the bot yet.

## Slice 4: Bot `/link` Command

Status: implemented locally for the Cloudflare webhook path. Focused tests and typechecks passed. Full Telegram smoke still requires the `telegram_link_codes` migration to be applied to the active database.

### Objective

Allow Telegram users to connect their Telegram account to their TrackX web account by sending `/link <code>`.

### Inspect

- Review `apps/webhook/src/handlers.ts`.
- Review `apps/webhook/src/api-client.ts`.
- Review `apps/webhook/src/allowlist.ts`.
- Review webhook tests.
- Review Cloudflare Worker env requirements.

### Map

Current:

- `/start` and `/help` return help text.
- `/link <code>` is handled before allowlist enforcement.
- Normal messages remain protected by allowlist and linked-user API checks.
- Unknown users get setup guidance instead of a hard allowlist message.

Target:

- `/link <code>` is allowed for users who are not already linked.
- Successful linking stores the Telegram user ID on the app user.
- Normal expense messages require a linked account.
- Unknown users get a helpful setup message.

### Plan

Files likely edited or added:

- `apps/webhook/src/handlers.ts`
- `apps/webhook/src/api-client.ts`
- `apps/webhook/src/allowlist.ts`
- `apps/webhook/src/__tests__/handlers.test.ts`
- `apps/web/src/app/api/telegram/link/route.ts`
- `README.md`
- `docs/cloudflare-webhook.md`
- `docs/telegram-setup.md`

Bot behavior:

- `/start`
  - Returns help text with `/link CODE`.
- `/link ABC123`
  - Calls web API with `TRACKX_API_SECRET`, code, and Telegram user ID.
  - Success: "Telegram connected. Send an expense when ready."
  - Expired or invalid code: "Code not recognized or expired. Create a new one in Settings."
  - Already linked: "This Telegram account is already connected."
- Normal expense from unlinked user:
  - "Connect Telegram in TrackX Settings first."

### Pre-Mortem

- Risk: allowlist blocks `/link` before users can onboard.
  - Mitigation: allow `/link` and `/start` before allowlist enforcement, or convert allowlist into optional emergency mode.
- Risk: bot exposes whether a specific account exists.
  - Mitigation: use generic invalid-code responses.
- Risk: race condition consumes the same code twice.
  - Mitigation: validate and consume inside one DB transaction.
- Risk: linked user cannot log because status cache is stale.
  - Mitigation: API reads DB on every Telegram request for now.

### Verify

- `pnpm --filter @trackx/webhook test`
- `pnpm --filter @trackx/webhook typecheck`
- `pnpm --filter @trackx/api-core test`
- `pnpm --filter @trackx/web typecheck`
- Signed-out `POST /api/telegram/link` returns `401 Unauthorized`.
- Manual local or staging Telegram smoke:
  - Generate code.
  - Send `/link CODE`.
  - Send `spent 3 euro on coffee`.
  - Confirm transaction appears in that user's dashboard.

### Gate

Stop after `/link` works in local/staging. Review before changing allowlist behavior in production.

## Slice 5: Remove Manual Allowlist As Primary Gate

Status: implemented locally. Focused webhook checks passed. Production verification still requires the local account-linking changes to be committed, deployed, and smoke-tested.

### Objective

Make linked-account ownership the primary access control for Telegram usage.

### Inspect

- Review current Cloudflare Worker env.
- Review production `TELEGRAM_ALLOWED_USER_IDS`.
- Review webhook behavior for linked and unlinked users.
- Review API route auth checks.

### Map

Current:

- Telegram access no longer depends on a static webhook allowlist.
- The Cloudflare webhook forwards normal messages to the API.

Target:

- Telegram access depends on DB-linked Telegram identity.
- Static allowlist is not part of the production webhook path.

### Plan

Files likely edited:

- `apps/webhook/src/allowlist.ts`
- `apps/webhook/src/handlers.ts`
- `apps/webhook/src/env.ts`
- `apps/webhook/src/__tests__/handlers.test.ts`
- `docs/cloudflare-webhook.md`
- `docs/telegram-setup.md`
- `.env.example`

Behavior decision:

- Implemented final model: no runtime access-mode environment switch.
- Webhook always allows `/start`, `/help`, and `/link CODE`.
- Webhook forwards normal messages to Vercel.
- Vercel API only accepts linked Telegram IDs before reading or writing data.

### Pre-Mortem

- Risk: removing allowlist opens bot spam to unlinked users.
  - Mitigation: unlinked users can only receive setup guidance; they cannot write transactions.
- Risk: support/debug becomes harder.
  - Mitigation: log safe event types, not message contents or secrets.
- Risk: production env drift.
  - Mitigation: update `env:check` and docs.

### Verify

- `pnpm env:check -- --target=vercel`
- `pnpm --filter @trackx/webhook test`
- `pnpm --filter @trackx/webhook typecheck`
- Production smoke:
  - Linked user can log.
  - Unlinked user cannot log.

### Gate

Stop after production behavior is verified with one linked account and one unlinked test case if possible.

## Slice 6: Account Management And Unlink

### Objective

Let a user manage the Telegram connection without manual database edits.

### Inspect

- Review Settings UI after Slice 3.
- Review user repository methods.
- Review security expectations for unlinking.

### Map

Current:

- Once linked, there is no self-serve disconnect path.

Target:

- User can disconnect Telegram from Settings.
- Disconnect requires confirmation.
- After disconnect, Telegram messages no longer log transactions.

### Plan

Files likely edited or added:

- `apps/web/src/components/settings/telegram-link-panel.tsx`
- `apps/web/src/app/api/telegram/unlink/route.ts`
- `packages/api-core/src/repositories/users.ts`
- `packages/api-core/src/services/telegram-link-service.ts`
- tests

Behavior:

- Connected state shows "Disconnect Telegram".
- Confirmation text explains that existing transactions remain.
- Disconnect clears `users.telegramUserId`.
- Pending link codes for that user are expired.

### Pre-Mortem

- Risk: accidental unlink.
  - Mitigation: require explicit confirmation.
- Risk: old code can relink unexpectedly.
  - Mitigation: expire active codes on unlink.
- Risk: existing transactions disappear.
  - Mitigation: only remove link; never alter transaction ownership.

### Verify

- `pnpm --filter @trackx/api-core test`
- `pnpm --filter @trackx/web test`
- Manual smoke:
  - Connect Telegram.
  - Disconnect Telegram.
  - Send Telegram expense.
  - Confirm bot refuses and dashboard data remains.

### Gate

Stop after unlink is verified. Review whether multiple Telegram accounts per user are needed later.

## Slice 7: Production Deployment And End-To-End Verification

### Objective

Prove the complete self-serve flow works in production.

### Inspect

- Review Vercel env vars.
- Review Cloudflare Worker env vars.
- Review Supabase migration status.
- Review webhook registration.
- Review current production logs.

### Map

Current:

- Vercel hosts the web app and same-origin API routes.
- Cloudflare Worker handles Telegram webhooks.
- Supabase stores production data.

Target:

- All production services use the same account-linking model.
- No manual DB edits are required for a new user.
- No static Telegram ID setup is required for normal users.

### Plan

Deployment steps:

1. Apply Supabase migration.
2. Deploy Vercel web/API.
3. Deploy Cloudflare Worker webhook if webhook code changed.
4. Confirm Telegram webhook target still points at Cloudflare Worker.
5. Run the full account flow with a real Telegram account.

Production smoke:

1. Create a test account.
2. Confirm email.
3. Open Settings.
4. Generate link code.
5. Send `/link CODE` to the bot.
6. Send `spent 3 euro on coffee`.
7. Open dashboard.
8. Confirm the entry appears under the correct user.
9. Confirm another unlinked Telegram user cannot log transactions.

### Pre-Mortem

- Risk: Vercel and Cloudflare use different API secrets.
  - Mitigation: verify env names and rotate secret if mismatch is suspected.
- Risk: Supabase migration is not applied before deploy.
  - Mitigation: check migration status before Vercel deploy.
- Risk: old Worker deployment is still active.
  - Mitigation: verify Worker deployment timestamp and webhook URL.
- Risk: production logs contain sensitive data.
  - Mitigation: log only event types and safe identifiers.

### Verify

- Vercel deployment is `READY`.
- Cloudflare Worker deployment is current.
- Supabase table exists and advisors are clean or understood.
- Production `/api/health` returns ok.
- Telegram end-to-end smoke passes.

### Gate

Stop after production verification and update docs with the final runbook.

## Documentation Updates Required

Update these docs as slices land:

- `README.md`
  - Account setup
  - Telegram linking flow
  - Env var changes
- `docs/telegram-setup.md`
  - `/link` command
  - webhook behavior
  - allowlist deprecation or access mode
- `docs/cloudflare-webhook.md`
  - Worker env vars
  - deployment verification
- `docs/platform-stack.md`
  - Supabase Auth + API-owned business data
  - Cloudflare Worker role
- `.env.example`
  - Any new env vars

## Acceptance Criteria

The feature is complete only when:

- A new user can create an account without manual DB work.
- A logged-in user can connect Telegram from Settings.
- Telegram can log expenses for that linked user.
- Unlinked Telegram users cannot create transactions.
- Existing dashboard and transaction editing still work.
- Existing parser behavior still works.
- Budget totals still use normalized EUR amounts.
- Docs explain the complete setup clearly.
- Focused tests and one production smoke test pass.

## Recommended Execution Order

Start with Slice 1 and Slice 2 only.

Reason:

- Slice 1 improves the visible onboarding without changing core data behavior.
- Slice 2 adds the secure foundation.
- The working Telegram bot remains untouched until the link-code model is tested.

After Slice 2 is reviewed, proceed to Slice 3 and Slice 4 together as the first user-visible linking milestone.
