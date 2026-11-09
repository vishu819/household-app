-- Household Vault registry. Run after the existing household setup.
-- Contains Drive file IDs only, never vault passwords, Google tokens or credentials.
create table if not exists public.household_vault_links (
 household_id text primary key references public.households(id) on delete cascade,
 drive_id text not null,
 created_at timestamptz not null default now()
);
alter table public.household_vault_links enable row level security;
revoke all on public.household_vault_links from public, anon, authenticated;

create or replace function public.household_vault_get(p_id text,p_pin text)
returns text language plpgsql security definer set search_path = '' as $$
declare result text;
begin
 if not exists(select 1 from public.households where id=p_id and pin=p_pin) then raise exception 'Invalid household credentials'; end if;
 select drive_id into result from public.household_vault_links where household_id=p_id;
 return result;
end;$$;

create or replace function public.household_vault_link(p_id text,p_pin text,p_drive_id text)
returns text language plpgsql security definer set search_path = '' as $$
declare result text;
begin
 -- Serialize linking for this household. A second device cannot replace its vault.
 perform 1 from public.households where id=p_id and pin=p_pin for update;
 if not found then raise exception 'Invalid household credentials'; end if;
 if p_drive_id is null or p_drive_id !~ '^[A-Za-z0-9_-]{1,200}$' then raise exception 'Invalid Drive file ID'; end if;
 insert into public.household_vault_links(household_id,drive_id) values(p_id,p_drive_id) on conflict(household_id) do nothing;
 select drive_id into result from public.household_vault_links where household_id=p_id;
 if result<>p_drive_id then raise exception 'Household already linked to another vault'; end if;
 return result;
end;$$;
revoke all on function public.household_vault_get(text,text) from public;
revoke all on function public.household_vault_link(text,text,text) from public;
grant execute on function public.household_vault_get(text,text) to anon,authenticated;
grant execute on function public.household_vault_link(text,text,text) to anon,authenticated;
