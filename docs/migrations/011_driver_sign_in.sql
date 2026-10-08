-- 011 — a second, driver-only access code per event.
--
-- Members who drive others to an event earn driver points on top of their
-- normal attendance points. An event can carry an optional second code that
-- checks someone in AS A DRIVER, with its own base points and multiplier.
--
-- WHY columns on `events` rather than a hidden child event row: a child row
-- would have to be filtered out of every events read (the member grid, the
-- dashboard, RTC, the calendar mirror), and one missed filter shows members a
-- phantom event. The driver code shares the event's check-in window and its
-- `is_open` switch, so it is a property of the event, not a second event. It
-- is never mirrored to Google Calendar — only title, calendar window, and
-- location ever are.
--
-- WHY `sign_ins.role`: a driver who also attends checks in with both codes and
-- earns both, so one person can now hold two rows for one event. The unique
-- index from 001 moves from (event_id, eid) to (event_id, eid, role), keeping
-- the duplicate guard in the database — still one row per person per role.
--
-- Safe to re-run.

-- ── events ────────────────────────────────────────────────────────────────

alter table public.events
  add column if not exists driver_access_code text,
  add column if not exists driver_base_points numeric,
  add column if not exists driver_multiplier numeric;

-- Partial: most events have no driver code, and NULLs must not collide.
create unique index if not exists events_driver_access_code_key
  on public.events (driver_access_code)
  where driver_access_code is not null;

-- All three or none. A code without points would award NaN; points without a
-- code are unreachable and would only confuse the next person reading a row.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'events_driver_fields_together'
      and conrelid = 'public.events'::regclass
  ) then
    alter table public.events
      add constraint events_driver_fields_together check (
        (driver_access_code is null and driver_base_points is null and driver_multiplier is null)
        or
        (driver_access_code is not null and driver_base_points is not null and driver_multiplier is not null)
      );
  end if;
end $$;

comment on column public.events.driver_access_code is
  'Optional second check-in code for drivers. Shares check_in_start/end and '
  'is_open with access_code. Officer-only — never projected, never sent to '
  'Google Calendar.';

-- ── sign_ins ──────────────────────────────────────────────────────────────

-- NOT NULL with a default, so every existing row backfills to 'attendee' —
-- which is what all of them are.
alter table public.sign_ins
  add column if not exists role text not null default 'attendee';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'sign_ins_role_check'
      and conrelid = 'public.sign_ins'::regclass
  ) then
    alter table public.sign_ins
      add constraint sign_ins_role_check check (role in ('attendee', 'driver'));
  end if;
end $$;

-- Build the new guard BEFORE dropping the old one, so there is never a moment
-- when a double-submit could slip through.
create unique index if not exists sign_ins_event_id_eid_role_key
  on public.sign_ins (event_id, eid, role);

drop index if exists public.sign_ins_event_id_eid_key;

-- Driver check-ins for one event:
--
--   select eid, points_earned, created_at
--   from public.sign_ins
--   where event_id = '…' and role = 'driver' and deleted_at is null;
