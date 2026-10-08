import { createAdminClient } from '@/lib/supabase/admin'
import { fetchAll } from '@/lib/supabase/fetchAll'
import { memberName, termBounds } from '@/lib/format'

/**
 * General meeting attendance — who came to how many GMs this term, with the
 * contact details officers need to follow up.
 *
 * Nothing is hardcoded: a GM is any live event whose committee (primary or
 * co-host) is "General Meeting", so a newly created GM and every new check-in
 * show up on the next page load. Numbering is by date within the term, which
 * matches how the events are titled ("General Meeting #3 - …").
 */

export type GeneralMeeting = {
  id: string
  /** 1-based, in date order within the term. */
  number: number
  title: string
  /** `calendar_start`. */
  date: string
}

export type GmAttendee = {
  eid: string
  name: string
  /** For sorting by surname without re-splitting `name`. */
  lastName: string
  email: string
  phone: string
  major: string
  /** GM numbers attended, ascending. */
  attended: number[]
}

export type GmReport = {
  meetings: GeneralMeeting[]
  /** Everyone who attended at least one GM, most attended first. */
  attendees: GmAttendee[]
  termLabel: string
  /** A read that failed, in plain language, or null — see lib/rtc.ts for why it's surfaced. */
  error: string | null
}

const GM_TYPE = 'General Meeting'

export async function getGmReport(now: Date = new Date()): Promise<GmReport> {
  const supabase = createAdminClient()
  const term = termBounds(now)

  const { data: eventRows, error: eventError } = await supabase
    .from('events')
    .select('id, title, calendar_start')
    // Quoted: the value has a space, which PostgREST's `or` syntax won't take bare.
    .or(`event_type.eq."${GM_TYPE}",secondary_event_type.eq."${GM_TYPE}"`)
    .is('deleted_at', null)
    .gte('calendar_start', term.startsAt.toISOString())
    .lt('calendar_start', term.endsAt.toISOString())
    .order('calendar_start')

  const meetings: GeneralMeeting[] = (eventRows ?? []).map((e, i) => ({
    id: e.id,
    number: i + 1,
    title: e.title,
    date: e.calendar_start,
  }))
  const numberById = new Map(meetings.map((m) => [m.id, m.number]))

  // An empty `.in()` list is an easy way to select the whole table.
  const { data: signIns, error: signInError } =
    meetings.length === 0
      ? { data: [], error: null }
      : await fetchAll((from, to) =>
          supabase
            .from('sign_ins')
            .select('eid, event_id')
            // Attendance only — a driver who stayed has their own attendee row.
            .eq('role', 'attendee')
            .is('deleted_at', null)
            .in('event_id', meetings.map((m) => m.id))
            .order('id')
            .range(from, to)
        )

  const attendedByEid = new Map<string, Set<number>>()
  for (const row of signIns) {
    const n = numberById.get(row.event_id)
    if (!n) continue
    const set = attendedByEid.get(row.eid) ?? new Set<number>()
    set.add(n)
    attendedByEid.set(row.eid, set)
  }

  // Only the attendees' roster rows — `sign_ins.eid` is a foreign key to
  // `members.eid`, so the spellings already match.
  const eids = [...attendedByEid.keys()]
  const { data: memberRows, error: memberError } =
    eids.length === 0
      ? { data: [], error: null }
      : await fetchAll((from, to) =>
          supabase
            .from('members')
            .select('eid, first_name, last_name, email, phone, major')
            .in('eid', eids)
            .order('eid')
            .range(from, to)
        )
  const memberByEid = new Map(memberRows.map((m) => [m.eid, m]))

  const attendees: GmAttendee[] = eids
    .map((eid) => {
      const m = memberByEid.get(eid)
      return {
        eid,
        name: memberName(m?.first_name, m?.last_name, eid),
        lastName: m?.last_name?.trim() ?? '',
        email: m?.email?.trim() ?? '',
        phone: formatPhone(m?.phone),
        major: m?.major?.trim() ?? '',
        attended: [...attendedByEid.get(eid)!].sort((a, b) => a - b),
      }
    })
    .sort(
      (a, b) =>
        b.attended.length - a.attended.length ||
        a.lastName.localeCompare(b.lastName) ||
        a.name.localeCompare(b.name)
    )

  const error =
    describeReadFailure(eventError) ??
    describeReadFailure(signInError) ??
    describeReadFailure(memberError)

  return { meetings, attendees, termLabel: term.label, error }
}

/** "(512) 555-0134" for a 10-digit US number; anything else as entered. */
function formatPhone(raw: string | null | undefined): string {
  const value = raw?.trim() ?? ''
  const digits = value.replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '')
  return digits.length === 10
    ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    : value
}

function describeReadFailure(error: { code?: string; message: string } | null): string | null {
  if (!error) return null
  if (error.code === '42703') {
    return 'A column this report needs is missing from the database — check that every migration in docs/migrations/ has been applied.'
  }
  return `The attendance data could not be read (${error.message}). The list below is incomplete.`
}
