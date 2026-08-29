-- 008 — mark a member as part of the RTC stipend group.
--
-- A small fixed set of members — the ones whose RTC attendance the VPE reports
-- on. It is NOT a computed status: nothing in the app derives eligibility from
-- an attendance threshold, and nothing should. The flag says "this person is on
-- the list", and /admin/rtc counts what they attended. No threshold, no
-- eligible/ineligible verdict.
--
-- NOT NULL with a default rather than a nullable boolean, for the same reason
-- as `events.is_rtc` in 007: a NULL would be a third state meaning "nobody has
-- said", which reads identically to false in a query but needs `is not true`
-- everywhere to stay correct. Every existing member backfills to false, which
-- is the right answer — the stipend group is opt-in.
--
-- NO index, deliberately. `members` is one row per chapter member, and the one
-- query that filters this reads the whole flagged set at once. A seq scan over
-- a few hundred rows is not worth an index to maintain on every roster sync.
--
-- This column has NOTHING to do with points. `sign_ins.points_earned` and the
-- leaderboard never read it, and RTC attendance is counted separately.
--
-- Safe to re-run.

alter table public.members
  add column if not exists stipend_eligible boolean not null default false;

comment on column public.members.stipend_eligible is
  'True for members in the RTC stipend group, whose RTC attendance the VPE '
  'reports on at /admin/rtc. Set by hand. Never affects points or the '
  'leaderboard, and is not derived from any attendance threshold.';

-- Put someone on the list (there is no member admin UI — run this here):
--
--   update public.members set stipend_eligible = true
--   where eid in ('abc1234', 'def5678');
--
-- Who is on it now:
--
--   select first_name, last_name, eid from public.members
--   where stipend_eligible order by last_name;
