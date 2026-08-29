-- 007 — mark an event as counting toward RTC (Road to Convention).
--
-- RTC attendance is tracked separately from chapter points: a member's RTC
-- count decides stipend paperwork, not their leaderboard position. This flag is
-- the only thing that says which events feed that count.
--
-- WHY a column on `events` rather than reusing `event_type`: 'Road to
-- Convention (RTC)' used to be one of the committee values and still sits on
-- old rows (see the note in lib/events.ts), but it was dropped from the create
-- form. More to the point, an RTC event can belong to ANY committee — a
-- Professional Development workshop can count toward RTC — so the two are
-- independent facts and matching on the committee string would miss most of
-- them.
--
-- NOT NULL with a default rather than a nullable boolean, deliberately. A NULL
-- would be a third state meaning "nobody has said", indistinguishable in a
-- query from "not an RTC event" without `is not true` on every read. Existing
-- rows backfill to false, which is the correct answer for all of them.
--
-- NO index, deliberately. This table holds one row per chapter event — a few
-- hundred at most — so the planner seq-scans it whatever indexes exist, and
-- every query that filters `is_rtc` also filters `deleted_at` and a term date
-- range. A partial index here would cost write maintenance and buy nothing
-- measurable. Revisit if the table ever reaches five figures.
--
-- The flag applies per row, so a recurring series gets it on every occurrence —
-- the create action stamps it onto each week's row, not onto the group.
--
-- Safe to re-run.

alter table public.events
  add column if not exists is_rtc boolean not null default false;

comment on column public.events.is_rtc is
  'True when attendance at this event counts toward a member''s RTC (Road to '
  'Convention) total. Independent of event_type and of the points system — it '
  'never affects points_earned or the leaderboard.';

-- Every RTC event this term:
--
--   select title, calendar_start, event_type
--   from public.events
--   where is_rtc
--     and deleted_at is null
--     and calendar_start >= '2026-08-01'
--   order by calendar_start;
