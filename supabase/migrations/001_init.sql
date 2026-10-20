-- Landscape community: profiles + newsletter preferences.
-- Idempotent: safe to run on every build (scripts/migrate.mjs).

do $$ begin
  create type public.profile_visibility as enum ('public', 'members', 'hidden');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.newsletter_frequency as enum ('weekly', 'biweekly', 'monthly', 'off');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  slug          text not null unique,
  name          text not null,
  headline      text,
  crafts        text[] not null default '{}',
  skills        text[] not null default '{}',
  city          text,
  bio           text,
  links         jsonb not null default '[]'::jsonb,
  portfolio_url text,
  experience    jsonb not null default '[]'::jsonb,
  visibility    public.profile_visibility not null default 'members',
  open_to       text[] not null default '{}',
  ai_fields     text[] not null default '{}',   -- fields drafted by AI that the person hasn't edited
  cv_path       text,                           -- private storage path, only if the person chose to keep the CV
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.newsletter_prefs (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  frequency    public.newsletter_frequency not null default 'off',
  topics       text[] not null default '{}',
  consent_at   timestamptz,   -- when the person opted in (anti-spam law: explicit consent)
  consent_text text,          -- the exact wording they agreed to
  updated_at   timestamptz not null default now()
);

create index if not exists profiles_visibility_idx on public.profiles (visibility);
create index if not exists profiles_crafts_idx on public.profiles using gin (crafts);

-- updated_at
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists newsletter_prefs_touch on public.newsletter_prefs;
create trigger newsletter_prefs_touch before update on public.newsletter_prefs
  for each row execute function public.touch_updated_at();

-- Row level security
alter table public.profiles enable row level security;
alter table public.newsletter_prefs enable row level security;

drop policy if exists profiles_owner_all on public.profiles;
create policy profiles_owner_all on public.profiles
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles
  for select to anon, authenticated
  using (visibility = 'public');

drop policy if exists profiles_members_read on public.profiles;
create policy profiles_members_read on public.profiles
  for select to authenticated
  using (visibility = 'members');

-- Newsletter preferences: people read their own row; every write goes through the server (service role).
-- (Re-running this file never opens writes again; see 005 and 007.)
drop policy if exists newsletter_owner_all on public.newsletter_prefs;
drop policy if exists newsletter_owner_select on public.newsletter_prefs;
create policy newsletter_owner_select on public.newsletter_prefs
  for select to authenticated
  using ((select auth.uid()) = user_id);

grant usage on schema public to anon, authenticated;
grant select on public.profiles to anon, authenticated;
grant insert, update, delete on public.profiles to authenticated;
revoke all on public.newsletter_prefs from anon, authenticated;
grant select on public.newsletter_prefs to authenticated;

-- On sign-up, create a switched-off preferences row. Consent is recorded only by the server after the
-- address is confirmed (/auth/callback); metadata sent by the browser is never trusted.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.newsletter_prefs (user_id, email, frequency)
  values (new.id, coalesce(new.email, ''), 'off')
  on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
