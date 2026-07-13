-- Owner: packages/db. Stores per-user merchant category memory for parser overrides.

create type "MerchantCategoryRuleSource" as enum (
    'manual',
    'telegram_correction',
    'import_correction'
);

create table "merchant_category_rules" (
    "id" uuid not null,
    "userId" uuid not null,
    "categoryId" uuid not null,
    "merchantPattern" text not null,
    "normalizedMerchant" text not null,
    "source" "MerchantCategoryRuleSource" not null default 'manual',
    "createdAt" timestamp(3) not null default current_timestamp,
    "updatedAt" timestamp(3) not null,

    constraint "merchant_category_rules_pkey" primary key ("id")
);

create unique index "merchant_category_rules_userId_normalizedMerchant_key"
  on "merchant_category_rules"("userId", "normalizedMerchant");

create index "merchant_category_rules_userId_categoryId_idx"
  on "merchant_category_rules"("userId", "categoryId");

alter table "merchant_category_rules"
  add constraint "merchant_category_rules_userId_fkey"
  foreign key ("userId") references "users"("id")
  on delete cascade on update cascade;

alter table "merchant_category_rules"
  add constraint "merchant_category_rules_categoryId_fkey"
  foreign key ("categoryId") references "categories"("id")
  on delete restrict on update cascade;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all privileges on table public.merchant_category_rules from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all privileges on table public.merchant_category_rules from authenticated;
  end if;
end $$;

alter table public.merchant_category_rules enable row level security;

create policy "api_only_no_public_access"
  on public.merchant_category_rules
  for all
  to anon, authenticated
  using (false)
  with check (false);
