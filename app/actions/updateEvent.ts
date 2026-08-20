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
 * Change the date, time, and location of an event that hasn't happened yet.
 *
 * Only those three fields. Title, committee, points, and above all the access
 * code are immutable here: the code may already be printed on a flyer, and
 * silently reissuing it would strand everyone holding the old one.
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

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('Enter a valid start and end time.')
  }
  if (end.getTime() <= start.getTime()) {
    throw new Error('The event has to end after it starts.')
  }

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
      location,
    })
    .eq('id', input.eventId)

  if (updateError) throw new Error(updateError.message)

  // Only now, with the row already committed, mirror onto the chapter calendar.
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

  return { calendarWarning }
}
