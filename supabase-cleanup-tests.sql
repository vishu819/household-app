-- OPTIONAL: remove only the throwaway test households created during setup.
-- Run in Supabase → SQL Editor. This deletes rows by their exact test IDs,
-- so it CANNOT affect your real household (which has a different id).

-- 1) See what will be deleted first (safe — just a preview):
select id, pin, updated_at, jsonb_pretty(data) as data
from public.households
where id in (
  'cf3beb7dead948b5911400beae9cb8d3',
  'd740f643fcca49e9bb83aa7e527efcac'
);

-- 2) If that list looks like only test data, delete just those rows:
delete from public.households
where id in (
  'cf3beb7dead948b5911400beae9cb8d3',
  'd740f643fcca49e9bb83aa7e527efcac'
);

-- 3) (Optional) list ALL remaining households so you can confirm your real
--    one is still there. This is the ONLY place the pin column is visible,
--    and only to you in the SQL editor.
-- select id, pin, rev, updated_at from public.households order by updated_at desc;
