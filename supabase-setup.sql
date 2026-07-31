-- Family Finance — Supabase setup
-- Run this once in your Supabase project:
--   Dashboard → SQL Editor → New query → paste all of this → Run
-- Safe to re-run (uses IF NOT EXISTS / CREATE OR REPLACE).

-- 1) The shared household table. One row per household.
create table if not exists public.households (
  id          text primary key,              -- the unguessable household code
  pin         text not null,                 -- shared secret PIN (never selectable)
  data        jsonb not null default '{}',   -- the whole app state blob
  rev         bigint not null default 1,     -- last-write-wins revision counter
  updated_at  timestamptz not null default now()
);

-- 2) Lock the table down. No direct table access via the anon key.
alter table public.households enable row level security;
revoke all on public.households from anon, authenticated;

-- 3) All access goes through two SECURITY DEFINER functions that require the PIN.
--    This means the PIN is checked server-side and the pin column is never exposed.

-- Create a new household. Returns the generated id.
create or replace function public.household_create(p_pin text, p_data jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id text := replace(gen_random_uuid()::text, '-', '');
begin
  if p_pin is null or length(p_pin) < 4 then
    raise exception 'PIN must be at least 4 digits';
  end if;
  insert into public.households (id, pin, data, rev, updated_at)
  values (new_id, p_pin, coalesce(p_data, '{}'::jsonb), 1, now());
  return new_id;
end;
$$;

-- Read a household — only if the code + PIN match.
create or replace function public.household_get(p_id text, p_pin text)
returns table (data jsonb, rev bigint, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
    select h.data, h.rev, h.updated_at
    from public.households h
    where h.id = p_id and h.pin = p_pin;
end;
$$;

-- Write a household — only if the code + PIN match. Rejects stale writes (older rev).
create or replace function public.household_put(p_id text, p_pin text, p_data jsonb, p_rev bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  cur_rev bigint;
begin
  select rev into cur_rev from public.households where id = p_id and pin = p_pin;
  if cur_rev is null then
    raise exception 'Wrong household code or PIN';
  end if;
  -- accept only newer revisions (last-write-wins)
  if p_rev >= cur_rev then
    update public.households
      set data = p_data, rev = p_rev, updated_at = now()
      where id = p_id and pin = p_pin;
    return p_rev;
  end if;
  return cur_rev; -- caller is behind; keep server copy
end;
$$;

-- 4) Let the anon (publishable) key call ONLY these three functions.
grant execute on function public.household_create(text, jsonb)          to anon, authenticated;
grant execute on function public.household_get(text, text)              to anon, authenticated;
grant execute on function public.household_put(text, text, jsonb, bigint) to anon, authenticated;
