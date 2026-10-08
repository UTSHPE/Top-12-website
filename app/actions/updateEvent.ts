'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { generateAccessCode } from '@/lib/accessCode'

export type UpdateEventResult = {
  /**
   * Set when the row was updated but the calendar entry was not. The edit still
   * succeeded — shown as a warning, not an error, matching how createEvent
   * reports a calendar failure it has already committed rows past.
   */
  calendarWarning: string | null
}

/**
 * Change the title, timing, and location of an event that hasn't happened yet.
 *
 * Two independent windows: the calendar window (when the event runs, mirrored
 * to Google) and the check-in window (when a code actually works, internal
 * only). Plus `is_open`, the officer's manual switch. All three matter —
 * lib/checkin.ts gates a check-in on `withinWindow && is_open !== false`, so
 * the timestamps are not vestigial and neither is the flag.
 *
 * Committee, points, and above all the access code stay immutable: the code may
 * already be printed on a flyer, and silently reissuing it would strand everyone
 * holding the old one. The title is safe to change — sign_ins reference the
 * event by id, so a rename carries every existing check-in with it.
 *
 * Order matters — Supabase first, Google second. The database is the source of
 * truth for check-in, so a Google outage must never block an officer from
 * fixing a room change an hour before the event.
 */
export async function updateEvent(input: {
  eventId: string
  title: string
  /** ISO instants, already resolved from chapter-local wall time by the form. */
  calendarStart: string
  calendarEnd: string
  checkInStart: string
  checkInEnd: string
  /** The manual switch. Saved with the rest so one Save means one state. */
  isOpen: boolean
  /**
   * Counts toward RTC. Rides along here for the same reason `isOpen` does, but
   * note this path is gated to upcoming events — correcting the flag on an
   * event that already happened goes through setEventRtc instead.
   */
  isRtc: boolean
  location: string
  /**
   * Turn on driver sign-in for an event that doesn't have it yet. Ignored once
   * a driver code exists — from then on the code and its points are as fixed
   * as the attendee code, for the same reason: it may already be in a group
   * chat.
   */
  addDriver?: { basePoints: number; multiplier: number }
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
    .select('id, title, calendar_start, google_event_id, access_code, driver_access_code')
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
      'This event has already started, so it can no longer be edited.'
    )
  }

  const title = input.title.trim()
  if (!title) throw new Error('Give the event a title.')

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

  const addDriver = input.addDriver ?? null
  if (
    addDriver &&
    !(
      Number.isFinite(addDriver.basePoints) &&
      addDriver.basePoints > 0 &&
      Number.isFinite(addDriver.multiplier) &&
      addDriver.multiplier > 0
    )
  ) {
    throw new Error('Driver points and multiplier have to be positive numbers.')
  }

  const { error: updateError } = await supabase
    .from('events')
    .update({
      title,
      calendar_start: start.toISOString(),
      calendar_end: end.toISOString(),
      check_in_start: checkInStart.toISOString(),
      check_in_end: checkInEnd.toISOString(),
      is_open: input.isOpen,
      is_rtc: input.isRtc,
      location,
    })
    .eq('id', input.eventId)

  if (updateError) throw new Error(updateError.message)

  // Driver sign-in, added at most once. Re-checked against the stored row
  // rather than trusting the form, and written with an `is null` guard so two
  // officers saving at once can't each mint a different code — the second
  // write simply matches nothing.
  //
  // Nothing here touches Google: the driver code never goes on the calendar.
  if (addDriver && !event.driver_access_code) {
    let driverCode = generateAccessCode()
    while (driverCode === event.access_code) driverCode = generateAccessCode()

    const { error: driverError } = await supabase
      .from('events')
      .update({
        driver_access_code: driverCode,
        driver_base_points: addDriver.basePoints,
        driver_multiplier: addDriver.multiplier,
      })
      .eq('id', input.eventId)
      .is('driver_access_code', null)

    if (driverError) throw new Error(driverError.message)
  }

  // Only now, with the row already committed, mirror onto the chapter calendar.
  // Only the title, calendar window, and location go to Google — the check-in window
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
      const { patchCalendarEvent, insertCalendarEvent } = await import(
        '@/lib/google/calendar'
      )
      const entry = {
        title,
        calendarStart: start.toISOString(),
        calendarEnd: end.toISOString(),
        location,
      }
      const outcome = await patchCalendarEvent(event.google_event_id, entry)

      // A hand-deleted entry comes back as 'restored' and needs no warning —
      // the edit landed on the calendar. 'missing' means Google has purged it
      // entirely, so there is nothing left to bring back: put a fresh entry on
      // the calendar instead and repoint the row at it. Leaving the row on the
      // dead id would make every later edit (and the delete) miss again.
      if (outcome === 'restored') {
        console.info('[gcal] restored a deleted calendar entry on edit:', title)
      } else if (outcome === 'missing') {
        const newId = await insertCalendarEvent(entry)
        console.info('[gcal] recreated a purged calendar entry on edit:', title)

        if (newId) {
          const { error: linkError } = await supabase
            .from('events')
            .update({ google_event_id: newId })
            .eq('id', input.eventId)
          // The entry is on the calendar, so the edit is visible — but nothing
          // points at it, so deleting the event will not remove it.
          if (linkError) {
            console.error('[gcal] recreated the entry but could not store its id:', title, linkError.message)
            calendarWarning =
              'The event was updated and re-added to the Google Calendar, but the new entry could not be linked to it, so deleting the event will not remove it from the calendar.'
          }
        }
      }
    } catch (err) {
      // Read the reason inline rather than importing calendarErrorMessage: the
      // failure being handled may BE the module failing to load, and a second
      // import would throw straight back out of this catch.
      const reason =
        (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data
          ?.error?.message ??
        (err instanceof Error ? err.message : 'Unknown Google Calendar error')

      console.error('[gcal] patch failed:', title, reason)
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
