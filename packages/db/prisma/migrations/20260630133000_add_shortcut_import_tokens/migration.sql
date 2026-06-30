-- Owner: packages/db. Stores hashed iOS Shortcut import tokens for account-bound imports.

create table "shortcut_import_tokens" (
    "id" uuid not null,
    "userId" uuid not null,
    "label" text not null,
    "tokenHash" text not null,
    "tokenPreview" text not null,
    "lastUsedAt" timestamp(3),
    "revokedAt" timestamp(3),
    "createdAt" timestamp(3) not null default current_timestamp,
    "updatedAt" timestamp(3) not null,

    constraint "shortcut_import_tokens_pkey" primary key ("id")
);

create unique index "shortcut_import_tokens_tokenHash_key"
  on "shortcut_import_tokens"("tokenHash");

create index "shortcut_import_tokens_userId_revokedAt_idx"
  on "shortcut_import_tokens"("userId", "revokedAt");

alter table "shortcut_import_tokens"
  add constraint "shortcut_import_tokens_userId_fkey"
  foreign key ("userId") references "users"("id")
  on delete restrict on update cascade;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all privileges on table public.shortcut_import_tokens from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all privileges on table public.shortcut_import_tokens from authenticated;
  end if;
end $$;

alter table public.shortcut_import_tokens enable row level security;

create policy "api_only_no_public_access"
  on public.shortcut_import_tokens
  for all
  to anon, authenticated
  using (false)
  with check (false);
