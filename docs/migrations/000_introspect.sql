-- 000_introspect.sql — READ ONLY. Changes nothing.
--
-- Run this in the Supabase SQL editor and paste the output into docs/SCHEMA.md.
-- It fills in the parts that could not be verified through PostgREST with the
-- anon key: constraints, foreign keys, nullability, defaults, and RLS policies.

-- 1. Columns, types, nullability, defaults ---------------------------------
select
  table_name,
  ordinal_position as pos,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('events', 'members', 'sign_ins')
order by table_name, ordinal_position;

-- 2. Every constraint (PK / FK / UNIQUE / CHECK), with FK delete rules ------
select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name  as references_table,
  ccu.column_name as references_column,
  rc.delete_rule,
  rc.update_rule
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on kcu.constraint_name = tc.constraint_name
 and kcu.table_schema    = tc.table_schema
left join information_schema.constraint_column_usage ccu
  on ccu.constraint_name = tc.constraint_name
 and ccu.table_schema    = tc.table_schema
 and tc.constraint_type  = 'FOREIGN KEY'
left join information_schema.referential_constraints rc
  on rc.constraint_name  = tc.constraint_name
 and rc.constraint_schema = tc.table_schema
where tc.table_schema = 'public'
  and tc.table_name in ('events', 'members', 'sign_ins')
order by tc.table_name, tc.constraint_type, tc.constraint_name;

-- 3. Indexes ---------------------------------------------------------------
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('events', 'members', 'sign_ins')
order by tablename, indexname;

-- 4. Is RLS actually enabled? ----------------------------------------------
select
  c.relname          as table_name,
  c.relrowsecurity   as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('events', 'members', 'sign_ins');

-- 5. The policies themselves -----------------------------------------------
select
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual        as using_expression,
  with_check  as with_check_expression
from pg_policies
where schemaname = 'public'
  and tablename in ('events', 'members', 'sign_ins')
order by tablename, policyname;

-- 6. Real row counts (this bypasses the RLS ambiguity noted in SCHEMA.md) ---
select 'events' as t, count(*) from public.events
union all select 'members',  count(*) from public.members
union all select 'sign_ins', count(*) from public.sign_ins;
