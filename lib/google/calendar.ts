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
