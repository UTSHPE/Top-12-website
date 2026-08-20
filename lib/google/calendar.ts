import { google } from 'googleapis'

/**
 * Google Calendar bridge for the chapter calendar.
 *
 * Fail loudly on missing configuration at import time rather than silently
 * degrading — a silent fallback (e.g. `?? 'primary'`) writes events to the
 * service account's own private calendar, which nobody can see.
 */
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. The Google Calendar bridge cannot start.`
    )
  }
  return value
}

const CLIENT_EMAIL = requireEnv('GOOGLE_CLIENT_EMAIL')
const CALENDAR_ID = requireEnv('GOOGLE_CALENDAR_ID')
// Env files store the PEM with escaped newlines; restore them or the key fails
// to decode ("DECODER routines::unsupported").
const PRIVATE_KEY = requireEnv('GOOGLE_PRIVATE_KEY').replace(/\\n/g, '\n')

export const CALENDAR_TIME_ZONE = 'America/Chicago'

// calendar.events is sufficient for insert — verified against the live
// calendar. Do not widen to the full calendar scope without a reason.
const auth = new google.auth.JWT({
  email: CLIENT_EMAIL,
  key: PRIVATE_KEY,
  scopes: ['https://www.googleapis.com/auth/calendar.events'],
})

const calendar = google.calendar({ version: 'v3', auth })

/** Google puts the useful reason in the response body, not in err.message. */
export function calendarErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { error?: { message?: string } } }; message?: string }
  return e?.response?.data?.error?.message ?? e?.message ?? 'Unknown Google Calendar error'
}

/**
 * Insert a single event onto the chapter calendar.
 * Throws on failure — callers decide whether that is fatal.
 */
export async function insertCalendarEvent(input: {
  title: string
  location: string | null
  /** RFC3339 timestamp, e.g. the ISO string stored on the event row. */
  calendarStart: string
  calendarEnd: string
}): Promise<string | null | undefined> {
  const res = await calendar.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: input.title,
      location: input.location ?? undefined,
      start: { dateTime: input.calendarStart, timeZone: CALENDAR_TIME_ZONE },
      end: { dateTime: input.calendarEnd, timeZone: CALENDAR_TIME_ZONE },
    },
  })

  return res.data.id
}

/**
 * Remove a single event from the chapter calendar.
 *
 * 404 and 410 are treated as success: the entry is already gone, which is the
 * outcome the caller wanted. Google returns 404 for an id it has never seen and
 * 410 ("Resource has been deleted") for one deleted previously.
 *
 * Anything else throws — callers decide whether that is fatal. It is not fatal
 * for event deletion, which must complete regardless.
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  try {
    await calendar.events.delete({ calendarId: CALENDAR_ID, eventId })
  } catch (err) {
    const status =
      (err as { code?: number })?.code ??
      (err as { response?: { status?: number } })?.response?.status
    if (status === 404 || status === 410) return
    throw err
  }
}

/**
 * Move an existing calendar entry and/or change its location.
 *
 * `patch`, never `update`: update replaces the whole resource, so any field
 * omitted from the body — description, summary, attendees, the recurrence rule —
 * would be wiped. Patch merges, which is the only correct verb for an edit that
 * knows about three fields and nothing else.
 *
 * Returns 'missing' rather than throwing when the entry is gone. The caller has
 * to report that as a warning but must not treat it as a failed edit — the
 * database row is already updated by the time this runs. Anything else throws
 * and the caller decides.
 *
 * 'Gone' covers three cases, and the third is the one that bites. A deleted
 * entry is not 404 here: events.delete only marks it `status: 'cancelled'`, and
 * Google happily accepts a patch against it, returning 200 with the new times
 * applied to an entry that no listing will ever show. Verified against the live
 * calendar. Trusting the 200 would report success for an edit nobody can see,
 * so the response status is checked rather than just the HTTP code.
 */
export async function patchCalendarEvent(
  eventId: string,
  input: {
    /** RFC3339 timestamps, as stored on the event row. */
    calendarStart: string
    calendarEnd: string
    location: string | null
  }
): Promise<'patched' | 'missing'> {
  try {
    const res = await calendar.events.patch({
      calendarId: CALENDAR_ID,
      eventId,
      requestBody: {
        start: { dateTime: input.calendarStart, timeZone: CALENDAR_TIME_ZONE },
        end: { dateTime: input.calendarEnd, timeZone: CALENDAR_TIME_ZONE },
        // Send '' rather than undefined to clear a location an officer emptied.
        // undefined would leave the old value in place, since patch merges.
        location: input.location ?? '',
      },
    })
    return res.data.status === 'cancelled' ? 'missing' : 'patched'
  } catch (err) {
    const status =
      (err as { code?: number })?.code ??
      (err as { response?: { status?: number } })?.response?.status
    if (status === 404 || status === 410) return 'missing'
    throw err
  }
}
