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

-- Sign-up from the digest form records frequency and crafts too (stored in user metadata by the form).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  opted boolean := coalesce((new.raw_user_meta_data ->> 'newsletter_opt_in')::boolean, false);
  freq text := coalesce(new.raw_user_meta_data ->> 'newsletter_frequency', 'weekly');
  crafts text[] := coalesce(
    (select array_agg(value) from jsonb_array_elements_text(coalesce(new.raw_user_meta_data -> 'newsletter_crafts', '[]'::jsonb)) as t(value)),
    '{}');
begin
  if freq not in ('weekly', 'biweekly', 'monthly') then freq := 'weekly'; end if;
  insert into public.newsletter_prefs (user_id, email, frequency, crafts, consent_at, consent_text)
  values (
    new.id,
    coalesce(new.email, ''),
    case when opted then freq::public.newsletter_frequency else 'off'::public.newsletter_frequency end,
    case when opted then crafts[1:12] else '{}' end,
    case when opted then now() end,
    case when opted then new.raw_user_meta_data ->> 'consent_text' end
  )
  on conflict (user_id) do nothing;
  return new;
end $$;
