-- Owner: packages/db. Explicit API-only RLS policies for hosted public tables.

create policy "api_only_no_public_access"
  on public.budgets
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "api_only_no_public_access"
  on public.categories
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "api_only_no_public_access"
  on public.exchange_rates
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "api_only_no_public_access"
  on public.parse_events
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "api_only_no_public_access"
  on public.pending_clarifications
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "api_only_no_public_access"
  on public.transactions
  for all
  to anon, authenticated
  using (false)
  with check (false);

create policy "api_only_no_public_access"
  on public.users
  for all
  to anon, authenticated
  using (false)
  with check (false);
