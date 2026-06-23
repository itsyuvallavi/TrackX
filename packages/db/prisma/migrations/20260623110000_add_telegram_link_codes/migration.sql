-- Owner: packages/db. Adds one-time Telegram account linking codes.

create extension if not exists "pgcrypto";

create table "telegram_link_codes" (
  "id" uuid primary key default gen_random_uuid(),
  "userId" uuid not null,
  "codeHash" text not null,
  "expiresAt" timestamp(3) not null,
  "consumedAt" timestamp(3),
  "telegramUserId" text,
  "createdAt" timestamp(3) not null default current_timestamp,
  "updatedAt" timestamp(3) not null default current_timestamp,
  constraint "telegram_link_codes_userId_fkey"
    foreign key ("userId") references "users"("id")
    on delete restrict on update cascade
);

create index "telegram_link_codes_codeHash_consumedAt_expiresAt_idx"
  on "telegram_link_codes"("codeHash", "consumedAt", "expiresAt");

create index "telegram_link_codes_userId_consumedAt_idx"
  on "telegram_link_codes"("userId", "consumedAt");

alter table "telegram_link_codes" enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon')
    and exists (select 1 from pg_roles where rolname = 'authenticated')
  then
    execute 'create policy "api_only_no_public_access"
      on public.telegram_link_codes
      for all
      to anon, authenticated
      using (false)
      with check (false)';
  end if;
end $$;
