import { createAdminClient } from '@/lib/supabase/admin'
import { termBounds } from '@/lib/format'

/**
 * RTC attendance reporting.
 *
 * Deliberately separate from lib/leaderboard.ts and from anything that touches
 * points. RTC attendance is a headcount the VPE reports on for stipend
 * paperwork; it is not a score, it does not rank anyone, and it must never
 * reach the board. The two share the `sign_ins` table and nothing else:
 * nothing here reads `points_earned`, and nothing on the leaderboard reads
 * `is_rtc` or `stipend_eligible`.
 *
 * There is no threshold and no eligible/ineligible verdict anywhere in this
 * file, by design — `members.stipend_eligible` says who is on the list, and
 * this counts what they attended. Deciding what a count means is the VPE's job.
 */

export type RtcAttendedEvent = {
  id: string
  title: string
  /** `calendar_start` — when the event ran, not when they checked in. */
  date: string
}

export type RtcMemberRow = {
  eid: string
  name: string
  /** RTC events attended in range. Zero is a real, listed result. */
  count: number
  /** What they attended, oldest first — the drill-down. */
  events: RtcAttendedEvent[]
}

export type RtcReport = {
  rows: RtcMemberRow[]
  /** Every RTC event in range, whether or not anyone attended. */
  eventsInRange: number
  /** Echoed back so the page can show exactly what was counted. */
  range: { fromIso: string; toIso: string; label: string }
  /**
   * A read that failed, in plain language, or null.
   *
   * Reported rather than swallowed. Every other query helper in this repo ends
   * in `data ?? []`, which turns a missing column into an empty result — and
   * docs/migrations/README.md documents that silent-empty failure as the thing
   * that wastes an afternoon. On a report the VPE acts on, "nobody attended
   * anything" and "the query didn't run" must not look the same.
   */
  error: string | null
}

export type RtcRange = {
  from: Date
  /** Exclusive — see `termBounds`. */
  to: Date
  label: string
}

/**
 * The term to report on when the officer hasn't picked a range.
 *
 * Defaulting to the current semester rather than all-time is the whole point:
 * an unscoped count silently folds last year's convention into this year's
 * numbers, and nobody notices until the stipend list is wrong. The page always
 * prints the range it used, so the scope is stated rather than assumed, and the
 * officer can widen it deliberately with the date filter.
 */
export function defaultRtcRange(now: Date = new Date()): RtcRange {
  const term = termBounds(now)
  return { from: term.startsAt, to: term.endsAt, label: term.label }
}

/**
 * One row per stipend-group member, fewest RTC events first.
 *
 * Whoever is furthest behind is who the VPE needs to chase, so they sort to the
 * top. Members with nothing attended are listed with a 0 rather than dropped —
 * they are the most important rows on the page.
 *
 * Three reads and an in-memory join, matching how getDashboardStats aggregates:
 * the stipend group is a small fixed set and a term holds a handful of RTC
 * events, so this is a few hundred rows at worst.
 */
export async function getRtcReport(range: RtcRange): Promise<RtcReport> {
  const supabase = createAdminClient()

  const fromIso = range.from.toISOString()
  const toIso = range.to.toISOString()

  const [{ data: memberRows, error: memberError }, { data: eventRows, error: eventError }] =
    await Promise.all([
      supabase
        .from('members')
        .select('eid, first_name, last_name')
        .eq('stipend_eligible', true),
      // Soft-deleted events are excluded here, which is also what keeps their
      // sign_ins out: deleteEvent stamps both, but filtering the parent means a
      // child that somehow escaped stamping still can't be counted.
      supabase
        .from('events')
        .select('id, title, calendar_start')
        .eq('is_rtc', true)
        .is('deleted_at', null)
        .gte('calendar_start', fromIso)
        .lt('calendar_start', toIso),
    ])

  // 42703 is a column that doesn't exist, which here means a migration hasn't
  // been run. Named explicitly because the empty table it would otherwise
  // produce is indistinguishable from a real, correct empty result.
  const error = describeReadFailure(memberError) ?? describeReadFailure(eventError)

  const members = memberRows ?? []
  const events = eventRows ?? []
  const eventById = new Map(events.map((e) => [e.id, e]))

  // Skip the third round trip when there is nothing to match against. Without
  // this, an empty `.in()` list is an easy way to accidentally select the whole
  // table.
  const signIns =
    events.length === 0 || members.length === 0
      ? []
      : ((
          await supabase
            .from('sign_ins')
            .select('eid, event_id')
            .is('deleted_at', null)
            .in(
              'event_id',
              events.map((e) => e.id)
            )
        ).data ?? [])

  // Keyed on the EID exactly as stored. `sign_ins.eid` is a foreign key to
  // `members.eid` (verified — see docs/SCHEMA.md), so both sides already hold
  // the roster's own spelling and no case-folding is needed here.
  const attended = new Map<string, RtcAttendedEvent[]>()
  for (const row of signIns) {
    const event = eventById.get(row.event_id)
    if (!event) continue
    const list = attended.get(row.eid) ?? []
    list.push({ id: event.id, title: event.title, date: event.calendar_start })
    attended.set(row.eid, list)
  }

  const rows: RtcMemberRow[] = members
    .map((m) => {
      const events = (attended.get(m.eid) ?? []).sort((a, b) =>
        a.date.localeCompare(b.date)
      )
      return {
        eid: m.eid,
        name: `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || m.eid,
        count: events.length,
        events,
      }
    })
    // Fewest first. Name breaks ties so the order is stable between loads
    // rather than however Postgres happened to return the rows.
    .sort((a, b) => a.count - b.count || a.name.localeCompare(b.name))

  return {
    rows,
    eventsInRange: events.length,
    range: { fromIso, toIso, label: range.label },
    error,
  }
}

function describeReadFailure(error: { code?: string; message: string } | null): string | null {
  if (!error) return null
  if (error.code === '42703') {
    return 'A column this report needs is missing from the database — migrations 007 and 008 in docs/migrations/ have not both been applied yet. Counts below are not trustworthy until they are.'
  }
  return `The attendance data could not be read (${error.message}). The counts below are incomplete.`
}
