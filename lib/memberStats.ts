import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAll } from '@/lib/supabase/fetchAll'
import { getLeaderboard } from '@/lib/leaderboard'
import { isSafeEid, normalizeEid } from '@/lib/checkin'
import { categoryStyle, committeeLabel } from '@/lib/events'

export type AttendedEvent = {
  id: string
  title: string
  /** "Professional + SHPEtina" — resolved here so the client never imports lib/events. */
  committee: string
  /** Category colors for the date chip and label. */
  accent: string
  disc: string
  /** ISO string — the calendar start, which is what a member remembers. */
  start: string
  /** Everything earned at this event, driver points included. */
  points: number
  /** Did they also check in with the driver code? */
  driver: boolean
}

export type MemberStats = {
  name: string
  major: string | null
  classYear: string | null
  rank: number | null
  points: number
  events: AttendedEvent[]
}

/**
 * One member's standing and the events they checked in to, for /stats.
 *
 * Service-role, so server-only. Returns null when the EID isn't on the roster.
 * The EID itself is never part of the result, and the event columns stop at
 * what a member page may show — no access codes.
 */
export async function getMemberStats(rawEid: string): Promise<MemberStats | null> {
  const eid = normalizeEid(rawEid)
  // Same guard as check-in: `ilike` treats `%` and `_` as wildcards.
  if (!eid || !isSafeEid(eid)) return null

  const supabase = createAdminClient()

  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('eid')
    .ilike('eid', eid)
    .order('eid', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (memberError) throw new Error(`member lookup failed: ${memberError.message}`)
  if (!member) return null

  // The roster's spelling is what sign_ins stores.
  const canonicalEid = member.eid as string

  const [{ data: signIns, error: signInError }, board] = await Promise.all([
    fetchAll((from, to) =>
      supabase
        .from('sign_ins')
        .select('event_id, role, points_earned')
        .eq('eid', canonicalEid)
        .is('deleted_at', null)
        .order('id')
        .range(from, to)
    ),
    getLeaderboard(),
  ])

  if (signInError) throw new Error(`sign-in lookup failed: ${signInError.message}`)

  // One entry per event: an attendee row and a driver row for the same event
  // are one outing, with the points stacked.
  const perEvent = new Map<string, { points: number; driver: boolean }>()
  for (const row of signIns) {
    const id = String(row.event_id)
    const entry = perEvent.get(id) ?? { points: 0, driver: false }
    entry.points += Number(row.points_earned)
    if (row.role === 'driver') entry.driver = true
    perEvent.set(id, entry)
  }

  let events: AttendedEvent[] = []
  if (perEvent.size > 0) {
    const { data: rows, error: eventError } = await supabase
      .from('events')
      .select('id, title, event_type, secondary_event_type, calendar_start')
      .in('id', [...perEvent.keys()])
      .is('deleted_at', null)

    if (eventError) throw new Error(`event lookup failed: ${eventError.message}`)

    events = (rows ?? [])
      .map((row) => {
        const entry = perEvent.get(String(row.id))!
        const eventType = (row.event_type as string | null) ?? 'Other'
        const category = categoryStyle(eventType)
        return {
          id: String(row.id),
          title: row.title as string,
          committee: committeeLabel({
            eventType,
            secondaryEventType: (row.secondary_event_type as string | null) || null,
          }),
          accent: category.accent,
          disc: category.disc,
          start: row.calendar_start as string,
          points: entry.points,
          driver: entry.driver,
        }
      })
      .sort((a, b) => Date.parse(b.start) - Date.parse(a.start))
  }

  // Rank, name, and total come off the board itself so this page can never
  // disagree with the leaderboard.
  const standing = board.find((entry) => entry.eid === canonicalEid)

  return {
    name: standing?.name || canonicalEid,
    major: standing?.major ?? null,
    classYear: standing?.classYear ?? null,
    rank: standing?.rank ?? null,
    points: standing?.points ?? 0,
    events,
  }
}
