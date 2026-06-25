-- Owner: packages/db. Adds API-only message lifecycle events for production tracing.

create type "MessageEventStatus" as enum ('ok', 'ignored', 'failed');

create table "message_events" (
    "id" uuid not null,
    "correlationId" text not null,
    "source" text not null,
    "eventType" text not null,
    "status" "MessageEventStatus" not null,
    "userId" uuid,
    "telegramUserId" text,
    "telegramMessageId" text,
    "rawMessagePreview" text,
    "metadata" jsonb,
    "errorMessage" text,
    "createdAt" timestamp(3) not null default current_timestamp,

    constraint "message_events_pkey" primary key ("id")
);

create index "message_events_correlationId_createdAt_idx"
  on "message_events"("correlationId", "createdAt");

create index "message_events_userId_createdAt_idx"
  on "message_events"("userId", "createdAt");

create index "message_events_telegramUserId_createdAt_idx"
  on "message_events"("telegramUserId", "createdAt");

create index "message_events_eventType_createdAt_idx"
  on "message_events"("eventType", "createdAt");

create index "message_events_status_createdAt_idx"
  on "message_events"("status", "createdAt");

alter table "message_events"
  add constraint "message_events_userId_fkey"
  foreign key ("userId") references "users"("id")
  on delete set null on update cascade;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all privileges on table public.message_events from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all privileges on table public.message_events from authenticated;
  end if;
end $$;

alter table public.message_events enable row level security;

create policy "api_only_no_public_access"
  on public.message_events
  for all
  to anon, authenticated
  using (false)
  with check (false);
