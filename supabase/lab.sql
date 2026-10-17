-- SweGBG Lab: tables + Row Level Security.
-- Run once in Supabase → SQL Editor → New query → paste → Run. Safe to run again.
--
-- Lab never stores the visitor's files (logos, films stay on their computer).
-- Only settings (text, colours, style) are saved, and only for the logged-in user.

-- 1. Profiles: one row per user. "plan" decides free / plus. Users can READ their own row
--    but cannot change it themselves (no update policy) – you change plan in the Table Editor.
create table if not exists public.lab_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  plan text not null default 'free' check (plan in ('free', 'plus')),
  created_at timestamptz not null default now()
);
alter table public.lab_profiles enable row level security;

drop policy if exists "lab_profiles: read own" on public.lab_profiles;
create policy "lab_profiles: read own" on public.lab_profiles
  for select to authenticated using ((select auth.uid()) = id);

-- create the profile automatically when someone logs in the first time
create or replace function public.lab_handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.lab_profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists lab_on_auth_user_created on auth.users;
create trigger lab_on_auth_user_created
  after insert on auth.users for each row execute function public.lab_handle_new_user();

-- 2. Saved intros from Intro-studion (settings only, max ~8 KB each).
create table if not exists public.lab_intros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  settings jsonb not null check (pg_column_size(settings) < 8192),
  created_at timestamptz not null default now()
);
create index if not exists lab_intros_user_idx on public.lab_intros (user_id, created_at desc);
alter table public.lab_intros enable row level security;

drop policy if exists "lab_intros: read own" on public.lab_intros;
create policy "lab_intros: read own" on public.lab_intros
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "lab_intros: insert own" on public.lab_intros;
create policy "lab_intros: insert own" on public.lab_intros
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "lab_intros: update own" on public.lab_intros;
create policy "lab_intros: update own" on public.lab_intros
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "lab_intros: delete own" on public.lab_intros;
create policy "lab_intros: delete own" on public.lab_intros
  for delete to authenticated using ((select auth.uid()) = user_id);

-- nobody who is not logged in can touch the Lab tables
revoke all on public.lab_profiles, public.lab_intros from anon;
