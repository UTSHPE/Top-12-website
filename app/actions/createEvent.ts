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
  const calendarWarnings: string[] = []
  for (const row of rows) {
    let googleEventId: string | null | undefined
    try {
      googleEventId = await insertCalendarEvent({
        title: row.title,
        location: row.location,
        calendarStart: row.calendar_start,
        calendarEnd: row.calendar_end,
      })
    } catch (err) {
      // Log the full Google response body — the actionable reason (calendar not
      // shared, API not enabled) lives there, not in err.message. Deliberately
      // NOT dumping the whole error object: gaxios attaches `err.config`, which
      // carries the Authorization header.
      const body = (err as { response?: { data?: unknown } })?.response?.data
      console.error(
        '[gcal] insert failed:',
        row.title,
        row.calendar_start,
        body ? JSON.stringify(body, null, 2) : calendarErrorMessage(err)
      )
      calendarWarnings.push(calendarErrorMessage(err))
    }

    // Record which calendar entry this row created, so deleting the event can
    // remove it too. Deliberately outside the try above: this is a database
    // write, and a failure here is not a Calendar failure.
    //
    // Never fatal. The rows and the calendar entries both already exist — an
    // untracked calendar entry is a far better outcome than failing creation
    // after the fact. It just has to be deleted by hand later.
    if (googleEventId) {
      const insertedId = insertedRows?.find((r) => r.access_code === row.access_code)?.id
      if (insertedId) {
        const { error: linkError } = await supabase
          .from('events')
          .update({ google_event_id: googleEventId })
          .eq('id', insertedId)

        if (linkError) {
          console.error(
            '[gcal] created the calendar entry but could not store its id:',
            row.title,
            linkError.message
          )
        }
      }
    }
  }

  // Hand the codes back so the officer can put the first one on a slide right
  // away — that hand-off is the whole point of the create flow. The warnings
  // ride along so a partial success is never presented as a clean one.
  return { codes: rows.map((row) => row.access_code), calendarWarnings }
}
