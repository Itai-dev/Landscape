-- Rates and payment-terms survey (lib/survey/*) and invite links.
-- Idempotent: safe to run on every build (scripts/migrate.mjs).

-- One response per person per survey. Answers are bands and choices (no client or company names).
-- Deleting the account deletes the response.
create table if not exists public.survey_responses (
  user_id      uuid not null references auth.users (id) on delete cascade,
  survey_id    text not null,
  answers      jsonb not null default '{}'::jsonb,
  completed    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (user_id, survey_id)
);
create index if not exists survey_responses_done_idx on public.survey_responses (survey_id) where completed;
alter table public.survey_responses enable row level security;

-- Owner-only: each person reads and writes only their own response. Aggregates are computed on the
-- server with the service role; nobody can read another person's answers.
drop policy if exists survey_own_select on public.survey_responses;
create policy survey_own_select on public.survey_responses for select to authenticated using (auth.uid() = user_id);
drop policy if exists survey_own_insert on public.survey_responses;
create policy survey_own_insert on public.survey_responses for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists survey_own_update on public.survey_responses;
create policy survey_own_update on public.survey_responses for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists survey_own_delete on public.survey_responses;
create policy survey_own_delete on public.survey_responses for delete to authenticated using (auth.uid() = user_id);
revoke all on public.survey_responses from anon;

-- A personal invite code per person (?ref=CODE). Created by the server.
create table if not exists public.referral_codes (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  code       text not null unique,
  created_at timestamptz not null default now()
);
alter table public.referral_codes enable row level security;
drop policy if exists referral_codes_own_select on public.referral_codes;
create policy referral_codes_own_select on public.referral_codes for select to authenticated using (auth.uid() = user_id);
revoke all on public.referral_codes from anon;

-- Who joined through whose link. One inviter per person; written and read only by the server.
create table if not exists public.referrals (
  code             text not null references public.referral_codes (code) on delete cascade,
  referred_user_id uuid not null unique references auth.users (id) on delete cascade,
  created_at       timestamptz not null default now()
);
create index if not exists referrals_code_idx on public.referrals (code);
alter table public.referrals enable row level security;
revoke all on public.referrals from anon, authenticated;
