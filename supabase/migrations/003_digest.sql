-- Weekly digest ("השבוע בתעשייה"): crafts on the newsletter preferences, a send log, and sign-up choices.
-- Idempotent: safe to run on every build (scripts/migrate.mjs).

-- Crafts the digest is tailored to (taxonomy facets.craft slugs). Empty = the general edition.
alter table public.newsletter_prefs add column if not exists crafts text[] not null default '{}';
alter table public.newsletter_prefs add column if not exists last_sent_at timestamptz;
alter table public.newsletter_prefs add column if not exists unsubscribed_at timestamptz;

-- One row per person per edition, so the daily cron never sends the same edition twice.
-- Written and read only by the server (service role).
create table if not exists public.digest_sends (
  user_id    uuid not null references auth.users (id) on delete cascade,
  edition    text not null,             -- e.g. "2026-10-25" (the Sunday it belongs to)
  status     text not null,             -- sent | skipped_empty | failed
  message_id text,
  created_at timestamptz not null default now(),
  primary key (user_id, edition)
);
alter table public.digest_sends enable row level security;
revoke all on public.digest_sends from anon, authenticated;

-- (The sign-up trigger used to read the digest choice from user metadata. It no longer does: consent is
-- recorded only by the server after the address is confirmed. See 001 and 005.)
