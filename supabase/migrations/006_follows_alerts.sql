-- Follow companies and get an email when something changes there ("התראות על חברות").
-- Idempotent: safe to run on every build (scripts/migrate.mjs). Runs after 001–005.
-- Everything here is written only by the server (service role); people can read their own follows.

-- 1. Alert choices live next to the digest choices. Their own consent record: alerts are a separate list.
alter table public.newsletter_prefs add column if not exists alerts text not null default 'off';
do $$ begin
  alter table public.newsletter_prefs add constraint newsletter_prefs_alerts_check check (alerts in ('off', 'daily', 'weekly'));
exception when duplicate_object then null; end $$;
alter table public.newsletter_prefs add column if not exists alerts_consent_at timestamptz;
alter table public.newsletter_prefs add column if not exists alerts_consent_text text;
alter table public.newsletter_prefs add column if not exists alerts_last_sent_at timestamptz;

-- 2. Which companies a person follows. Org ids are directory ids (data/orgs), which never change.
create table if not exists public.org_follows (
  user_id    uuid not null references auth.users (id) on delete cascade,
  org_id     text not null check (char_length(org_id) between 1 and 120),
  created_at timestamptz not null default now(),
  primary key (user_id, org_id)
);
alter table public.org_follows enable row level security;
drop policy if exists follows_owner_select on public.org_follows;
create policy follows_owner_select on public.org_follows
  for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.org_follows from anon;
revoke insert, update, delete on public.org_follows from authenticated;
grant select on public.org_follows to authenticated;

-- At most 100 follows per person.
create or replace function public.org_follows_limit() returns trigger
language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.org_follows where user_id = new.user_id) >= 100 then
    raise exception 'follow_limit' using errcode = 'check_violation';
  end if;
  return new;
end $$;
drop trigger if exists org_follows_limit on public.org_follows;
create trigger org_follows_limit before insert on public.org_follows
  for each row execute function public.org_follows_limit();

-- 3. One row per person per update, so the daily run never sends the same update twice.
--    A "pending" row is claimed before sending and becomes "sent" after; server only.
create table if not exists public.alert_sends (
  user_id    uuid not null references auth.users (id) on delete cascade,
  signal_id  text not null,
  status     text not null,             -- pending | sent
  batch      text,                      -- the day it went out, e.g. "2026-10-21"
  message_id text,
  created_at timestamptz not null default now(),
  primary key (user_id, signal_id)
);
alter table public.alert_sends enable row level security;
revoke all on public.alert_sends from anon, authenticated;

-- 4. Who gets alerts: confirmed addresses taken from auth.users, with recorded consent, alerts switched
--    on and at least one follow. Callable only with the service role.
create or replace function public.alert_recipients()
returns table (user_id uuid, email text, alerts text, alerts_last_sent_at timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select p.user_id, u.email::text, p.alerts, p.alerts_last_sent_at
    from public.newsletter_prefs p
    join auth.users u on u.id = p.user_id
   where p.alerts <> 'off'
     and p.alerts_consent_at is not null
     and u.email_confirmed_at is not null
     and coalesce(u.email, '') <> ''
     and exists (select 1 from public.org_follows f where f.user_id = p.user_id)
$$;
revoke all on function public.alert_recipients() from public, anon, authenticated;
grant execute on function public.alert_recipients() to service_role;
