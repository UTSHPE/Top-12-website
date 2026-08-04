import { google } from 'googleapis'
import type { calendar_v3 } from 'googleapis'

/**
 * Google Calendar bridge for the chapter calendar.
 *
 * Credentials arrive as ONE base64 env var holding the whole service-account
 * JSON (`GOOGLE_CREDENTIALS_B64`). That is deliberate: `JSON.parse` restores the
 * real newlines inside `private_key` for free, so there is no
 * `.replace(/\\n/g, '\n')` shim to get wrong across local/Vercel environments.
 * Getting that wrong is what produced `error:1E08010C:DECODER
 * routines::unsupported` — Node's OpenSSL refusing a PEM whose line breaks were
 * still literal backslash-n.
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

export const CALENDAR_TIME_ZONE = 'America/Chicago'

/**
 * Built on first use and cached, NOT at module scope.
 *
 * Import-time construction would make a missing or malformed credential throw
 * while `app/actions/createEvent.ts` is merely being imported, which takes down
 * event creation as a whole. Calendar mirroring is the optional half of that
 * action — the access code must still be issued when Calendar is misconfigured.
 */
let cached: calendar_v3.Calendar | null = null

export function getCalendarClient(): calendar_v3.Calendar {
  if (cached) return cached

  const creds = JSON.parse(
    Buffer.from(requireEnv('GOOGLE_CREDENTIALS_B64'), 'base64').toString('utf8')
  )

  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key, // real newlines already, courtesy of JSON.parse
    scopes: ['https://www.googleapis.com/auth/calendar'],
  })

  cached = google.calendar({ version: 'v3', auth })
  return cached
}

export function getCalendarId(): string {
  return requireEnv('GOOGLE_CALENDAR_ID')
}

/**
 * Google puts the useful reason in the response body, not in `err.message` —
 * surfacing the bare error is how a permissions problem spent an afternoon
 * masquerading as an OpenSSL problem. Log the full body server-side, hand the
 * caller only the one sentence worth showing an officer.
 */
export function calendarErrorMessage(err: unknown): string {
  const e = err as {
    response?: { data?: { error?: { message?: string } } }
    errors?: { message?: string }[]
    message?: string
  }
  return (
    e?.response?.data?.error?.message ??
    e?.errors?.[0]?.message ??
    e?.message ??
    'Unknown Google Calendar error'
  )
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
  const res = await getCalendarClient().events.insert({
    calendarId: getCalendarId(),
    requestBody: {
      summary: input.title,
      location: input.location ?? undefined,
      start: { dateTime: input.calendarStart, timeZone: CALENDAR_TIME_ZONE },
      end: { dateTime: input.calendarEnd, timeZone: CALENDAR_TIME_ZONE },
    },
  })

  return res.data.id
}
