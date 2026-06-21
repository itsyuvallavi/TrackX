-- Owner: packages/db. Harden Supabase public table exposure for TrackX data.

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all privileges on table
      public.budgets,
      public.categories,
      public.exchange_rates,
      public.parse_events,
      public.pending_clarifications,
      public.transactions,
      public.users
    from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all privileges on table
      public.budgets,
      public.categories,
      public.exchange_rates,
      public.parse_events,
      public.pending_clarifications,
      public.transactions,
      public.users
    from authenticated;
  end if;
end $$;

alter table public.budgets enable row level security;
alter table public.categories enable row level security;
alter table public.exchange_rates enable row level security;
alter table public.parse_events enable row level security;
alter table public.pending_clarifications enable row level security;
alter table public.transactions enable row level security;
alter table public.users enable row level security;
