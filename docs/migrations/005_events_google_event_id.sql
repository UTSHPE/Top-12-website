-- 005 — remember which Google Calendar entry an event created.
--
-- WHY: app/actions/createEvent.ts mirrors every new event onto the chapter
-- calendar, and Google's events.insert returns the new entry's id — but that
-- value was being discarded. With nothing linking a T12 event to its calendar
-- entry, deleting the event left the calendar entry behind forever.
--
-- Nullable on purpose, with no default:
--   * NULL means "no calendar entry is tracked for this event" — either it
--     predates this column, or the Calendar call failed at creation time.
--   * The delete path skips the Google API entirely when it is NULL, so those
--     rows delete cleanly instead of erroring.
--
-- Events created BEFORE this migration keep a NULL id permanently. Their
-- calendar entries cannot be removed automatically and must be deleted by hand
-- from Google Calendar.
--
-- Safe to re-run.

alter table public.events
  add column if not exists google_event_id text;

comment on column public.events.google_event_id is
  'Google Calendar event id returned by events.insert. NULL means no calendar '
  'entry is tracked — the delete path skips Google entirely in that case.';

-- Find events whose calendar entry cannot be cleaned up automatically:
--
--   select id, title, calendar_start
--   from public.events
--   where google_event_id is null
--     and deleted_at is null
--   order by calendar_start desc;
