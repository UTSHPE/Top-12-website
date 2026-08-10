-- 006 — optional second committee for jointly-hosted events.
--
-- Some events are run by two committees together. This adds a nullable second
-- slot alongside the existing `event_type` column, which is unchanged.
--
-- Same type and same value format as `event_type`: plain text holding the
-- committee's display string verbatim ('Professional Development', 'SHPEtina',
-- …), exactly as the create form's select emits it.
--
-- NO check constraint or enum, deliberately — `event_type` has neither. It is
-- plain text that accepts any string (verified: an arbitrary value inserts
-- cleanly). Adding one here and not there would let the second committee be
-- stricter than the first, and would reject the legacy values still stored on
-- existing rows if this column were ever backfilled from them.
--
-- NULL means "no second committee", which is the default and the common case.
-- Nothing reads an empty string: the create action normalizes '' to NULL before
-- writing, so grouping and filtering never have to special-case it.
--
-- Existing rows are untouched and get NULL.
--
-- Safe to re-run.

alter table public.events
  add column if not exists secondary_event_type text;

comment on column public.events.secondary_event_type is
  'Optional co-hosting committee, same value format as event_type. NULL when '
  'the event has a single host. Never an empty string — the create action '
  'normalizes blank input to NULL.';

-- Find jointly-hosted events:
--
--   select title, event_type, secondary_event_type, calendar_start
--   from public.events
--   where secondary_event_type is not null
--     and deleted_at is null
--   order by calendar_start desc;
