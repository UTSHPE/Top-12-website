-- 001 — one check-in per person per event, enforced by the database.
--
-- WHY: the check-in path must not rely on SELECT-then-INSERT to spot a
-- duplicate. Two people submitting at the same instant both see "no existing
-- row" and both insert. The unique index makes the second insert fail with
-- SQLSTATE 23505, which app/api/checkin/route.ts catches and turns into the
-- friendly "You're already checked in!" response.
--
-- Safe to re-run.

-- Collapse any duplicates that already exist, keeping the earliest check-in.
-- Run the SELECT first if you want to see what will be removed.
--
--   select event_id, eid, count(*)
--   from public.sign_ins
--   group by event_id, eid
--   having count(*) > 1;

delete from public.sign_ins a
using public.sign_ins b
where a.event_id = b.event_id
  and a.eid      = b.eid
  and a.ctid     > b.ctid;

create unique index if not exists sign_ins_event_id_eid_key
  on public.sign_ins (event_id, eid);
