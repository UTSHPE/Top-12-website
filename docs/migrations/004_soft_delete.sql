-- 004 — soft delete for events and their attendance rows.
--
-- WHY: deleting an event destroys points history and silently reorders the
-- leaderboard. For a club board where a mis-click costs members their points,
-- the delete needs to be reversible.
--
-- Both tables get the column. Stamping `sign_ins.deleted_at` as well as
-- `events.deleted_at` keeps the leaderboard aggregation a single-table read —
-- lib/leaderboard.ts sums sign_ins directly and never joins events, so without
-- a stamp on the child rows a deleted event's points would keep counting.
--
-- Partial indexes: every read filters `deleted_at is null`, so index only the
-- live rows. Deleted rows are dead weight in the index otherwise.
--
-- Safe to re-run.

alter table public.events
  add column if not exists deleted_at timestamptz;

alter table public.sign_ins
  add column if not exists deleted_at timestamptz;

comment on column public.events.deleted_at is
  'Soft delete. NULL = live. Set by app/actions/deleteEvent.ts, which also '
  'stamps every child sign_ins row in the same operation.';

create index if not exists events_live_idx
  on public.events (calendar_start desc)
  where deleted_at is null;

create index if not exists sign_ins_live_idx
  on public.sign_ins (event_id)
  where deleted_at is null;

-- To restore an event and its check-ins:
--
--   update public.sign_ins set deleted_at = null where event_id = '<uuid>';
--   update public.events   set deleted_at = null where id       = '<uuid>';
--
-- To purge everything soft-deleted more than 90 days ago (the FK from
-- migration 002 cascades, so the sign_ins rows go with it):
--
--   delete from public.events
--   where deleted_at is not null
--     and deleted_at < now() - interval '90 days';
