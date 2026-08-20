'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type UpdateEventResult = {
  /**
   * Set when the row was updated but the calendar entry was not. The edit still
   * succeeded — shown as a warning, not an error, matching how createEvent
   * reports a calendar failure it has already committed rows past.
   */
  calendarWarning: string | null
}

/**
 * Change the timing and location of an event that hasn't happened yet.
 *
 * Two independent windows: the calendar window (when the event runs, mirrored
 * to Google) and the check-in window (when a code actually works, internal
 * only). Plus `is_open`, the officer's manual switch. All three matter —
 * lib/checkin.ts gates a check-in on `withinWindow && is_open !== false`, so
 * the timestamps are not vestigial and neither is the flag.
 *
 * Title, committee, points, and above all the access code stay immutable: the
 * code may already be printed on a flyer, and silently reissuing it would
 * strand everyone holding the old one.
 *
 * Order matters — Supabase first, Google second. The database is the source of
 * truth for check-in, so a Google outage must never block an officer from
 * fixing a room change an hour before the event.
 */
export async function updateEvent(input: {
  eventId: string
  /** ISO instants, already resolved from chapter-local wall time by the form. */
  calendarStart: string
  calendarEnd: string
  checkInStart: string
  checkInEnd: string
  /** The manual switch. Saved with the rest so one Save means one state. */
  isOpen: boolean
  location: string
}): Promise<UpdateEventResult> {
  // Same belt-and-braces authorization as createEvent and deleteEvent: the
  // /admin proxy wall covers this, but a server action is a public endpoint.
  const auth = await createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) throw new Error('Not authorized.')

  const supabase = createAdminClient()

  const { data: event, error: lookupError } = await supabase
    .from('events')
    .select('id, title, calendar_start, google_event_id')
    .eq('id', input.eventId)
    .is('deleted_at', null)
    .maybeSingle()

  if (lookupError) throw new Error(lookupError.message)
  if (!event) throw new Error('That event no longer exists.')

  // Re-check "upcoming" on the server against the CURRENT stored start, not
  // anything the client sent. The form hides Edit on past events, but the
  // client can't be trusted with that rule, and an event can also start while
  // the form sits open.
  if (new Date(event.calendar_start).getTime() <= Date.now()) {
    throw new Error(
      'This event has already started, so its time and location can no longer be changed.'
    )
  }

  const start = new Date(input.calendarStart)
  const end = new Date(input.calendarEnd)
  const checkInStart = new Date(input.checkInStart)
  const checkInEnd = new Date(input.checkInEnd)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Enter a valid event start and end time.')
  }
  if (end.getTime() <= start.getTime()) {
    throw new Error('The event has to end after it starts.')
  }

  // Both check-in columns are NOT NULL in the database. Rejecting a blank here
  // turns what would otherwise surface as a raw Postgres 23502 into something
  // an officer can act on.
  if (Number.isNaN(checkInStart.getTime()) || Number.isNaN(checkInEnd.getTime())) {
    throw new Error('Enter a valid check-in opening and closing time.')
  }
  if (checkInEnd.getTime() <= checkInStart.getTime()) {
    throw new Error('Check-in has to close after it opens.')
  }

  // Deliberately NOT requiring the check-in window to sit inside the calendar
  // window. Officers legitimately open check-in early or leave it open late,
  // and a hard rule here would block a real workflow. A window that misses the
  // event entirely is surfaced as a warning in the form instead.

  // An empty location is allowed — plenty of events are genuinely "TBD" — but
  // whitespace is not, since it reads as filled in and displays as blank.
  if (input.location.length > 0 && input.location.trim().length === 0) {
    throw new Error('Enter a location, or leave the field completely empty.')
  }
  const location = input.location.trim() || null

  const { error: updateError } = await supabase
    .from('events')
    .update({
      calendar_start: start.toISOString(),
      calendar_end: end.toISOString(),
      check_in_start: checkInStart.toISOString(),
      check_in_end: checkInEnd.toISOString(),
      is_open: input.isOpen,
      location,
    })
    .eq('id', input.eventId)

  if (updateError) throw new Error(updateError.message)

  // Only now, with the row already committed, mirror onto the chapter calendar.
  // Only the calendar window and location go to Google — the check-in window
  // and `is_open` are internal and have no counterpart on a calendar entry.
  //
  // Imported dynamically for the same reason deleteEvent does it: the calendar
  // module validates its env vars at module scope, and a static import would
  // make a misconfiguration throw while this action is merely being loaded —
  // taking the edit down with it. Here that failure lands in the catch below.
  let calendarWarning: string | null = null

  // A null id means no calendar entry is tracked (the event predates the
  // column, or the insert failed at creation). Nothing to patch; not an error.
  if (event.google_event_id) {
    try {
      const { patchCalendarEvent } = await import('@/lib/google/calendar')
      const outcome = await patchCalendarEvent(event.google_event_id, {
        calendarStart: start.toISOString(),
        calendarEnd: end.toISOString(),
        location,
      })

      // Covers both a missing entry and a deleted-but-still-addressable one;
      // either way nothing on the shared calendar shows this event any more.
      if (outcome === 'missing') {
        calendarWarning =
          'The event was updated, but it no longer has a live entry on the Google Calendar, so the new time is not showing there. Add it to the calendar by hand.'
      }
    } catch (err) {
      // Read the reason inline rather than importing calendarErrorMessage: the
      // failure being handled may BE the module failing to load, and a second
      // import would throw straight back out of this catch.
      const reason =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message ??
        (err instanceof Error ? err.message : 'Unknown Google Calendar error')

      console.error('[gcal] patch failed:', event.title, reason)
      calendarWarning = `The event was updated, but the Google Calendar entry could not be changed (${reason}). Update it by hand.`
    }
  }

  revalidatePath('/admin/events')
  revalidatePath('/admin')
  revalidatePath('/events')
  // The check-in screen reads the open event off this window.
  revalidatePath('/checkin')

  return { calendarWarning }
}
