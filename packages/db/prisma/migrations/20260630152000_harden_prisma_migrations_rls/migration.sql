-- Owner: packages/db. Locks Prisma migration history behind server-only database access.

do $$
begin
  if to_regclass('public._prisma_migrations') is not null then
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute 'revoke all privileges on table public._prisma_migrations from anon';
    end if;

    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute 'revoke all privileges on table public._prisma_migrations from authenticated';
    end if;

    execute 'alter table public._prisma_migrations enable row level security';
  end if;
end $$;
