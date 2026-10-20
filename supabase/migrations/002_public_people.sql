-- People listed from public sources (lib/generated/people.json): claims and removal requests.
-- Idempotent: safe to run on every build (scripts/migrate.mjs).

-- A member who says "this is me" on a listed person: the listed card is replaced by their profile.
alter table public.profiles add column if not exists claimed_from text;
create index if not exists profiles_claimed_from_idx on public.profiles (claimed_from) where claimed_from is not null;

-- Requests to remove a listed person. The card is hidden as soon as a request arrives; the research run
-- then removes the person from the company record. Written and read only by the server (service role).
create table if not exists public.removal_requests (
  id         uuid primary key default gen_random_uuid(),
  seed_id    text not null,
  name       text,
  org_ids    text[] not null default '{}',
  reason     text,
  contact    text,          -- optional, only if the requester wants a reply
  created_at timestamptz not null default now()
);
create index if not exists removal_requests_seed_idx on public.removal_requests (seed_id);
alter table public.removal_requests enable row level security;
-- No policies: anon and signed-in users can't read or write it directly.
revoke all on public.removal_requests from anon, authenticated;
