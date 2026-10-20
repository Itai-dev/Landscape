-- Final permissions, the alerts claim token and "first seen" for updates.
-- Runs once (scripts/migrate.mjs keeps a ledger) and is safe to run again.

-- 1. Server-only tables: no direct access at all for the browser roles (also no TRUNCATE, REFERENCES or
--    TRIGGER, which Supabase grants by default). People can read only their own rows where noted.
revoke all on public.newsletter_prefs from anon, authenticated;
grant select on public.newsletter_prefs to authenticated;          -- own row (policy newsletter_owner_select)

revoke all on public.survey_responses from anon, authenticated;
grant select on public.survey_responses to authenticated;          -- own response (policy survey_own_select)

revoke all on public.referral_codes from anon, authenticated;
grant select on public.referral_codes to authenticated;            -- own code (policy referral_codes_own_select)

revoke all on public.org_follows from anon, authenticated;
grant select on public.org_follows to authenticated;               -- own follows (policy follows_owner_select)

revoke all on public.digest_sends from anon, authenticated;
revoke all on public.alert_sends from anon, authenticated;
revoke all on public.referrals from anon, authenticated;
revoke all on public.survey_snapshots from anon, authenticated;
revoke all on public.removal_requests from anon, authenticated;

-- Policies that let people write their own rows directly are gone for good (writes go through the server).
drop policy if exists newsletter_owner_all on public.newsletter_prefs;
drop policy if exists survey_own_insert on public.survey_responses;
drop policy if exists survey_own_update on public.survey_responses;
drop policy if exists survey_own_delete on public.survey_responses;

-- 2. Alerts: each pending claim records the run that made it, so a failed run releases only its own claims.
alter table public.alert_sends add column if not exists claim text;

-- 3. When each update first appeared on the live site. Alerts count from this day, so an update merged
--    days after its own date still reaches the people following that company. Server only.
create table if not exists public.signal_seen (
  signal_id     text primary key,
  first_seen_at timestamptz not null default now()
);
alter table public.signal_seen enable row level security;
revoke all on public.signal_seen from anon, authenticated;
