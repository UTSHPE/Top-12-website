# Migrations

There is no migration tooling in this repo (no `supabase/` directory, no CLI in
`package.json`), so these are plain SQL files you apply by hand.

**Run them in order, in the Supabase SQL editor.** Every file is idempotent —
re-running one is harmless.

| # | File | What it does | Required? |
| --- | --- | --- | --- |
| 000 | `000_introspect.sql` | Read-only. Dumps constraints, FKs, RLS policies, real row counts. | No — diagnostic |
| 001 | `001_signins_unique_event_eid.sql` | Unique index on `sign_ins (event_id, eid)` | **Yes** |
| 002 | `002_signins_event_fk_cascade.sql` | `ON DELETE CASCADE` on the event FK | **Yes** |
| 003 | `003_events_is_open.sql` | Adds `events.is_open` | **Yes** |
| 004 | `004_soft_delete.sql` | Adds `deleted_at` to `events` and `sign_ins` | **Yes** |
| 005 | `005_events_google_event_id.sql` | Adds `events.google_event_id` | **Yes** |
| 006 | `006_events_secondary_committee.sql` | Adds `events.secondary_event_type` | **Yes** |
| 007 | `007_events_is_rtc.sql` | Adds `events.is_rtc` | **Yes** |
| 008 | `008_members_stipend_eligible.sql` | Adds `members.stipend_eligible` | **Yes** |

## ⚠️ 001, 003, and 004 must be applied before the app will work

This is not the usual "nice to have eventually". The application code in this
branch reads and writes `is_open` and `deleted_at`, and relies on the unique
index to detect duplicate check-ins.

Against a database without them, PostgREST returns `42703 column does not
exist`. The query helpers in `lib/events.ts` and `lib/leaderboard.ts` discard
errors and return `data ?? []`, so the failure is **silent** — the events grid,
leaderboard, and officer dashboard all render empty rather than showing an
error. If you see that after deploying, you have not run these yet.

`002` is the exception: it is a safety net for hard deletes performed outside
the app, so the app works without it. Run it anyway.

## Destructive steps to know about

- `001` deletes duplicate `sign_ins` rows, keeping the earliest per
  `(event_id, eid)`. The file has a commented-out `SELECT` to preview them.
- `002` deletes `sign_ins` rows pointing at an event that no longer exists —
  the orphans this whole change is meant to prevent. They cannot be kept; the
  FK will not build while they are there.

Both are no-ops on clean data.
