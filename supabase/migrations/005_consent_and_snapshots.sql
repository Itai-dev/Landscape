-- Consent and survey hardening, and daily survey snapshots.
-- Idempotent: safe to run on every build (scripts/migrate.mjs). Runs after 001–004, so it overrides them.

-- 1. Newsletter preferences are written only by the server (service role).
--    People can read their own row; every change goes through /api/digest/prefs, /api/profile,
--    /auth/callback or the unsubscribe link, which set consent and the address server-side.
drop policy if exists newsletter_owner_all on public.newsletter_prefs;
drop policy if exists newsletter_owner_select on public.newsletter_prefs;
create policy newsletter_owner_select on public.newsletter_prefs
  for select to authenticated
  using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.newsletter_prefs from anon, authenticated;
grant select on public.newsletter_prefs to authenticated;

-- 2. A new account never starts subscribed. Consent is recorded only after the person confirms the
--    address by opening the link in the email (/auth/callback), with wording set by the server.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.newsletter_prefs (user_id, email, frequency)
  values (new.id, coalesce(new.email, ''), 'off')
  on conflict (user_id) do nothing;
  return new;
end $$;

-- Rows subscribed by the old sign-up trigger for an address that was never confirmed: switch them off.
update public.newsletter_prefs p
   set frequency = 'off', consent_at = null, consent_text = null
  from auth.users u
 where u.id = p.user_id and u.email_confirmed_at is null and p.frequency <> 'off';

-- 3. Who the digest goes to: confirmed addresses taken from auth.users (never a column people can edit),
--    with recorded consent and the digest switched on. Callable only with the service role.
create or replace function public.digest_recipients()
returns table (user_id uuid, email text, frequency text, crafts text[], topics text[], last_sent_at timestamptz)
language sql stable security definer set search_path = public, auth as $$
  select p.user_id, u.email::text, p.frequency::text, p.crafts, p.topics, p.last_sent_at
    from public.newsletter_prefs p
    join auth.users u on u.id = p.user_id
   where p.frequency <> 'off'
     and p.consent_at is not null
     and u.email_confirmed_at is not null
     and coalesce(u.email, '') <> ''
$$;
revoke all on function public.digest_recipients() from public, anon, authenticated;
grant execute on function public.digest_recipients() to service_role;

-- 4. Survey answers are written only through /api/survey (validated, service role). People keep read
--    access to their own response.
drop policy if exists survey_own_insert on public.survey_responses;
drop policy if exists survey_own_update on public.survey_responses;
drop policy if exists survey_own_delete on public.survey_responses;
revoke insert, update, delete on public.survey_responses from anon, authenticated;
grant select on public.survey_responses to authenticated;
alter table public.survey_responses add column if not exists completed_at timestamptz;
update public.survey_responses set completed_at = updated_at where completed and completed_at is null;

-- 5. Results are published from a snapshot that changes at most once a day and only after at least
--    five new responses, so two snapshots can't be compared to learn one person's answers.
create table if not exists public.survey_snapshots (
  survey_id   text primary key,
  computed_at timestamptz not null default now(),
  responses   integer not null default 0,   -- completed responses counted in this snapshot (server only)
  data        jsonb not null default '{}'::jsonb
);
alter table public.survey_snapshots enable row level security;
revoke all on public.survey_snapshots from anon, authenticated;

-- 6. Invites: keep the time the invited account was created, so only new accounts are credited.
alter table public.referrals add column if not exists account_created_at timestamptz;
