-- Premium ("פרימיום"): subscriptions, the payment provider's event log and the waitlist, plus "instant" alerts.
-- Everything here is written only by the server (service role): the payment provider's webhook activates and
-- ends subscriptions, never the browser. People can read their own subscription row and nothing else.
-- Runs once (scripts/migrate.mjs keeps a ledger) and is safe to run again.

-- 1. One subscription per person. A row stays after cancelling: the plan keeps working until
--    current_period_end, then the person is back on the free tier.
create table if not exists public.subscriptions (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  status               text not null check (status in ('active', 'canceled', 'past_due', 'expired')),
  plan                 text not null check (plan in ('monthly', 'yearly')),
  provider             text not null check (char_length(provider) between 1 and 40),
  provider_ref         text check (provider_ref is null or char_length(provider_ref) <= 200),  -- the provider's subscription / recurring-order id
  current_period_end   timestamptz not null,
  cancel_at_period_end boolean not null default false,
  canceled_at          timestamptz,
  started_at           timestamptz not null default now(),  -- this run of the plan began (the 14-day refund window)
  period_start         timestamptz not null default now(),  -- the paid period now running began
  amount               numeric(10,2) check (amount is null or amount >= 0),  -- the last charge, in shekels
  refund_amount        numeric(10,2) check (refund_amount is null or refund_amount >= 0),
  refunded_at          timestamptz,
  refund_due           boolean not null default false,  -- owed but the provider refused: refunded by hand
  renewal_notice_for   timestamptz,  -- the period end a yearly renewal reminder was sent for
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
alter table public.subscriptions enable row level security;
drop policy if exists subscriptions_owner_select on public.subscriptions;
create policy subscriptions_owner_select on public.subscriptions
  for select to authenticated
  using ((select auth.uid()) = user_id);
revoke all on public.subscriptions from anon;
revoke insert, update, delete on public.subscriptions from authenticated;
grant select on public.subscriptions to authenticated;

-- 2. Every webhook the provider sends, once: a repeat delivery of the same event is ignored. Server only.
create table if not exists public.billing_events (
  id          text primary key check (char_length(id) between 1 and 200),
  provider    text not null,
  kind        text not null,
  user_id     uuid references auth.users (id) on delete set null,
  received_at timestamptz not null default now()
);
alter table public.billing_events enable row level security;
revoke all on public.billing_events from anon, authenticated;

-- 3. Who accepted which version of the terms, when joining premium (the checkout's consent box). Server only.
create table if not exists public.terms_acceptances (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  version     text not null check (char_length(version) between 1 and 40),
  context     text not null check (context in ('checkout')),
  plan        text check (plan is null or plan in ('monthly', 'yearly')),
  accepted_at timestamptz not null default now()
);
create index if not exists terms_acceptances_user on public.terms_acceptances (user_id);
alter table public.terms_acceptances enable row level security;
revoke all on public.terms_acceptances from anon, authenticated;

-- 4. Before payments open: people who asked to hear when premium is available. Server only.
create table if not exists public.premium_waitlist (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  plan       text check (plan is null or plan in ('monthly', 'yearly')),
  created_at timestamptz not null default now()
);
alter table public.premium_waitlist enable row level security;
revoke all on public.premium_waitlist from anon, authenticated;

-- 5. Premium alerts arrive within the hour ("instant"). The server only lets premium accounts choose it,
--    and treats it as "daily" once a subscription ends.
alter table public.newsletter_prefs drop constraint if exists newsletter_prefs_alerts_check;
alter table public.newsletter_prefs add constraint newsletter_prefs_alerts_check check (alerts in ('off', 'daily', 'weekly', 'instant'));

-- 6. The free tier is enforced by the server (lib/follows.js: 10 free, more with premium); the database keeps a
--    hard ceiling for everyone, raised from 100 to 500.
create or replace function public.org_follows_limit() returns trigger
language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.org_follows where user_id = new.user_id) >= 500 then
    raise exception 'follow_limit' using errcode = 'check_violation';
  end if;
  return new;
end $$;
