-- 012 — internal (tracking-only) events.
--
-- Officer-side meetings like LeaderSHPE need attendance tracked, but they are
-- not chapter events: they must not land on the chapter Google Calendar, must
-- not award points, and must not show up on member pages. Before this the
-- secretary kept a separate list by hand.
--
-- WHY a flag rather than a committee value: an internal meeting can belong to
-- any committee (Leadership, VPI, ...), and "is this for members?" is a
-- different question from "who runs it?" — the same reasoning as is_rtc in 007.
--
-- NOT NULL with a default, as in 007: existing rows backfill to false, which
-- is correct for every one of them, and no read has to cope with a NULL.
--
-- The CHECK holds the "worth nothing" half in the database. createEvent already
-- forces zero points and no driver code, but a row edited by hand through the
-- Supabase dashboard would otherwise be able to quietly start awarding points
-- from an event members can't even see.
--
-- Safe to re-run.

alter table public.events
  add column if not exists is_internal boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_internal_zero_points'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_internal_zero_points check (
        not is_internal or (base_points = 0 and driver_access_code is null)
      );
  end if;
end $$;

comment on column public.events.is_internal is
  'Officer tracking only: never mirrored to Google Calendar, worth zero points, '
  'hidden from member event listings. Check-in by code still works.';

-- Internal events this term:
--
--   select title, calendar_start, event_type
--   from public.events
--   where is_internal
--     and deleted_at is null
--     and calendar_start >= '2026-08-01'
--   order by calendar_start;
