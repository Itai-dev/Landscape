-- Short feedback from visitors ("משהו חסר? יש רעיון לשיפור?"), written only by the server (/api/feedback,
-- service role). No browser role can read or write it. The email is optional and kept only so we can reply.
-- Runs once (scripts/migrate.mjs keeps a ledger) and is safe to run again.

create table if not exists public.feedback (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  message    text not null check (char_length(message) between 1 and 1000),
  email      text check (email is null or char_length(email) <= 200),
  page       text check (page is null or char_length(page) <= 200)
);

alter table public.feedback enable row level security;
revoke all on public.feedback from anon, authenticated;
