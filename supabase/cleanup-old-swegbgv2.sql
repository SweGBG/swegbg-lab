-- Clean out the old swegbgv2 site from this Supabase project.
-- This CANNOT be undone. swegbg-creative (swegbg.com) does not use Supabase, so nothing live breaks,
-- but take a look before you run step 2.
--
-- Optional backup first: Database → Backups (paid plans), or Table Editor → each table → Export CSV.

-- STEP 1 – see what will be removed (run this alone first and read the list):
select table_name,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', table_name), false, true, '')))[1]::text::int as rows
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE' and table_name not like 'lab\_%'
order by table_name;

-- STEP 2 – remove every old table in "public" (keeps all lab_ tables and everything Supabase owns):
-- (remove the two dashes in front of each line below, then run)
-- do $$
-- declare t record;
-- begin
--   for t in select table_name from information_schema.tables
--            where table_schema = 'public' and table_type = 'BASE TABLE' and table_name not like 'lab\_%'
--   loop
--     execute format('drop table if exists public.%I cascade', t.table_name);
--   end loop;
-- end $$;

-- STEP 3 (optional) – old storage buckets: Storage → pick the bucket → Delete bucket.
-- STEP 4 (optional) – old users from the swegbgv2 site: Authentication → Users → select → Delete.
