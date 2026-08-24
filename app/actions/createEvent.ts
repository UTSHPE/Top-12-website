'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { generateAccessCode } from '@/lib/accessCode'
import { insertCalendarEvent, calendarErrorMessage } from '@/lib/google/calendar'
import crypto from 'crypto'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export async function createEvent(input: {
  title: string
  location: string
  eventType: string
  /** Co-hosting committee. Blank/absent means a single-committee event. */
  secondaryEventType?: string
  createdByOfficer: string
  calendarStart: Date
  calendarEnd: Date
  checkInStart: Date
  checkInEnd: Date
  basePoints: number
  multiplier: number
  isRecurring: boolean
  weekCount: number
}): Promise<{ codes: string[]; calendarWarnings: string[] }> {
  // Authorize: server actions POST to their host route, so the /admin/* proxy
  // wall covers this — but verify the session here too rather than relying on
  // the proxy alone (per Next.js data-security guidance).
  const auth = await createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) throw new Error('Not authorized.')

  const supabase = createAdminClient()

  // Committees, settled server-side. The form enforces most of this, but a
  // server action is a public endpoint and cannot trust what reaches it.
  //
  // Blank becomes null rather than '': an empty-string committee would slip
  // past every `is not null` check and break grouping and filtering.
  let primaryCommittee: string | null = input.eventType?.trim() || null
  let secondaryCommittee: string | null = input.secondaryEventType?.trim() || null

  // Only the co-host was chosen. Promote it rather than rejecting: the result
  // an officer meant is a single-committee event, and erroring on a state the
  // form cannot even produce would be noise. Promotion is why these are `let`.
  if (!primaryCommittee && secondaryCommittee) {
    primaryCommittee = secondaryCommittee
    secondaryCommittee = null
  }

  if (!primaryCommittee) throw new Error('Choose a committee for this event.')

  if (secondaryCommittee && secondaryCommittee === primaryCommittee) {
    throw new Error('Choose a different committee for the joint host.')
  }

  const recurrence_group_id = input.isRecurring ? crypto.randomUUID() : null

  const rows = Array.from({ length: input.weekCount }, (_, i) => ({
    title: input.title,
    location: input.location,
    event_type: primaryCommittee,
    secondary_event_type: secondaryCommittee,
    created_by_officer: input.createdByOfficer,
    calendar_start: new Date(input.calendarStart.getTime() + i * WEEK_MS).toISOString(),
    calendar_end: new Date(input.calendarEnd.getTime() + i * WEEK_MS).toISOString(),
    check_in_start: new Date(input.checkInStart.getTime() + i * WEEK_MS).toISOString(),
    check_in_end: new Date(input.checkInEnd.getTime() + i * WEEK_MS).toISOString(),
    base_points: input.basePoints,
    multiplier: input.multiplier,
    access_code: generateAccessCode(),
    recurrence_group_id,
  }))

  // `.select()` so each new row's id comes back — the Calendar loop below needs
  // it to record which calendar entry belongs to which event.
  const { data: insertedRows, error } = await supabase
    .from('events')
    .insert(rows)
    .select('id, access_code')
  if (error) throw new Error(error.message)

  // Mirror onto the chapter Google Calendar. The rows are already committed, so
  // a Calendar failure is reported back as a partial success rather than thrown —
  // but it must never be silent, which is what hid this bug for an afternoon.
  //
  // ALL AT ONCE, NOT IN A LOOP. This used to await each insert in sequence, and
  // that is why an eleven-week series reached the calendar as nothing at all:
  // one insert takes ~800ms, so a series spent 9-13s inside the request and the
  // serverless function was killed before — or partway through — the calendar
  // step, leaving every row with a null google_event_id. Measured against the
  // live calendar: 11 sequential inserts took 8.9s, while 16 in parallel took
  // 1.3s. Sixteen is the largest series the form can produce, so the whole step
  // now fits comfortably inside any function budget.
  const calendarWarnings: string[] = []

  const inserts = await Promise.allSettled(
    rows.map((row) =>
      insertCalendarEvent({
        title: row.title,
        location: row.location,
        calendarStart: row.calendar_start,
        calendarEnd: row.calendar_end,
      })
    )
  )

  // access_code is what ties a local row to the row that came back: it is
  // unique per event and generated here, so it survives the insert regardless
  // of what order PostgREST returns the rows in.
  const idByCode = new Map((insertedRows ?? []).map((r) => [r.access_code, r.id]))
  // Carries the title so a failed link write can name the event: `links` is a
  // filtered subset of `rows`, so its indices do not line up with theirs.
  const links: { id: string; googleEventId: string; title: string }[] = []

  inserts.forEach((result, i) => {
    const row = rows[i]

    if (result.status === 'rejected') {
      // Log the full Google response body — the actionable reason (calendar not
      // shared, API not enabled) lives there, not in err.message. Deliberately
      // NOT dumping the whole error object: gaxios attaches `err.config`, which
      // carries the Authorization header.
      const err = result.reason
      const body = (err as { response?: { data?: unknown } })?.response?.data
      console.error(
        '[gcal] insert failed:',
        row.title,
        row.calendar_start,
        body ? JSON.stringify(body, null, 2) : calendarErrorMessage(err)
      )
      calendarWarnings.push(calendarErrorMessage(err))
      return
    }

    const googleEventId = result.value
    if (!googleEventId) return

    const insertedId = idByCode.get(row.access_code)
    if (!insertedId) {
      // The entry exists on the calendar but nothing points at it, so deleting
      // the event will not remove it. Say so rather than dropping it silently —
      // the old code just skipped this case.
      console.error(
        '[gcal] created the calendar entry but could not match it to a row:',
        row.title,
        row.access_code
      )
      calendarWarnings.push(
        `A calendar entry for "${row.title}" could not be linked to its event, so deleting the event will not remove it from Google Calendar.`
      )
      return
    }

    links.push({ id: insertedId, googleEventId, title: row.title })
  })

  // Record which calendar entry each row created, so deleting the event can
  // remove it too. Deliberately outside the error handling above: this is a
  // database write, and a failure here is not a Calendar failure.
  //
  // Never fatal. The rows and the calendar entries both already exist — an
  // untracked calendar entry is a far better outcome than failing creation
  // after the fact. It just has to be deleted by hand later.
  //
  // Parallel for the same reason as the inserts: a sequential round trip per
  // row put the series back over the time budget it just escaped.
  const linkWrites = await Promise.allSettled(
    links.map(async ({ id, googleEventId }) => {
      const { error: linkError } = await supabase
        .from('events')
        .update({ google_event_id: googleEventId })
        .eq('id', id)
      if (linkError) throw new Error(linkError.message)
    })
  )

  linkWrites.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(
        '[gcal] created the calendar entry but could not store its id:',
        links[i].title,
        result.reason instanceof Error ? result.reason.message : result.reason
      )
    }
  })

  // One warning per distinct reason. A failing series would otherwise repeat
  // the same sentence sixteen times on the success card.
  const uniqueWarnings = [...new Set(calendarWarnings)]

  // Hand the codes back so the officer can put the first one on a slide right
  // away — that hand-off is the whole point of the create flow. The warnings
  // ride along so a partial success is never presented as a clean one.
  return { codes: rows.map((row) => row.access_code), calendarWarnings: uniqueWarnings }
}
