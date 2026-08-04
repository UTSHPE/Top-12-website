-- 002 — sign_ins.event_id FK gets ON DELETE CASCADE.
--
-- WHY: the app soft-deletes events (migration 004), so this is not the primary
-- cleanup path. It is the backstop for hard deletes that bypass the app
-- entirely — most importantly deleting a row from the Supabase dashboard,
-- which is how orphaned sign_ins rows appear in the first place.
--
-- Without this, a dashboard delete either fails with a FK violation or leaves
-- attendance rows pointing at an event that no longer exists, which then show
-- up on the leaderboard as points nobody can account for.
--
-- The existing constraint name is unknown (it could not be read without a
-- working service_role key), so this finds it rather than assuming
-- `sign_ins_event_id_fkey`.
--
-- Safe to re-run.

do $$
declare
  fk_name text;
begin
  select tc.constraint_name
    into fk_name
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on kcu.constraint_name = tc.constraint_name
   and kcu.table_schema    = tc.table_schema
  where tc.table_schema   = 'public'
    and tc.table_name     = 'sign_ins'
    and tc.constraint_type = 'FOREIGN KEY'
    and kcu.column_name   = 'event_id'
  limit 1;

  if fk_name is not null then
    execute format('alter table public.sign_ins drop constraint %I', fk_name);
    raise notice 'dropped existing FK %', fk_name;
  else
    raise notice 'no existing FK on sign_ins.event_id — creating one';
  end if;
end $$;

-- Remove rows that already point at a missing event; the FK cannot be created
-- while they exist.
delete from public.sign_ins s
where s.event_id is not null
  and not exists (select 1 from public.events e where e.id = s.event_id);

alter table public.sign_ins
  add constraint sign_ins_event_id_fkey
  foreign key (event_id) references public.events (id)
  on delete cascade;
