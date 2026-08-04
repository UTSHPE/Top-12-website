-- 003 — manual check-in kill switch.
--
-- WHY a boolean rather than a `checkin_closes_at` timestamp: the events table
-- already has `check_in_start` / `check_in_end`, and the server already refuses
-- a code outside that window. A second timestamp would duplicate `check_in_end`
-- and leave two columns that can disagree about when check-in ends.
--
-- What was actually missing is an override an officer can hit *now* — someone
-- photographed the slide, or the meeting ended early. `is_open` is that switch.
--
-- Check-in requires BOTH: is_open = true AND now within the check_in window.
-- The toggle can only ever close check-in early, never extend it past
-- check_in_end, so a stale code can't be revived by flipping a boolean.
--
-- Safe to re-run.

alter table public.events
  add column if not exists is_open boolean not null default true;

comment on column public.events.is_open is
  'Officer kill switch for check-in. Ignored unless now() is also within '
  'check_in_start..check_in_end — this can close check-in early, never extend it.';
