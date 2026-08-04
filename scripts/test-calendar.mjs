/**
 * Isolated Google Calendar bridge check — runs OUTSIDE Next.js so an auth or
 * permission problem can be told apart from a framework/request problem.
 *
 * Usage:  npm run test:calendar
 *
 * Reads everything from .env.local. Never hardcode credentials here, and never
 * print key material — `client_email` is the only credential field echoed,
 * because you need it to share the calendar with the bot.
 */
import dotenv from 'dotenv'
import { google } from 'googleapis'

dotenv.config({ path: '.env.local' })

const CALENDAR_TIME_ZONE = 'America/Chicago'

function fail(step, err) {
  const body = err?.response?.data
  console.error(`\n❌ ${step}`)
  console.error(body ? JSON.stringify(body, null, 2) : (err?.message ?? String(err)))
  process.exit(1)
}

// --- Step 0: decode the credential (presence and shape only) ---
const b64 = process.env.GOOGLE_CREDENTIALS_B64
if (!b64) fail('GOOGLE_CREDENTIALS_B64 is not set', new Error('Check .env.local exists and is saved.'))

const calendarId = process.env.GOOGLE_CALENDAR_ID
if (!calendarId) fail('GOOGLE_CALENDAR_ID is not set', new Error('Check .env.local.'))

let creds
try {
  creds = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'))
} catch (err) {
  fail('GOOGLE_CREDENTIALS_B64 did not decode to JSON — it is probably truncated or wrapped across multiple lines in .env.local', err)
}

console.log('bot client_email:', creds.client_email)
console.log('calendar id:     ', calendarId)
console.log('')

const auth = new google.auth.JWT({
  email: creds.client_email,
  key: creds.private_key, // real newlines already, courtesy of JSON.parse
  scopes: ['https://www.googleapis.com/auth/calendar'],
})

const cal = google.calendar({ version: 'v3', auth })

// --- Step 1: read the target calendar's metadata ---
let meta
try {
  meta = await cal.calendars.get({ calendarId })
  console.log(`✅ READ    ${meta.data.summary} (tz: ${meta.data.timeZone})`)
} catch (err) {
  fail('READ failed — could not fetch calendar metadata', err)
}

// --- Step 2: insert a throwaway event about an hour out ---
const start = new Date(Date.now() + 60 * 60 * 1000)
const end = new Date(start.getTime() + 30 * 60 * 1000)

let eventId
try {
  const res = await cal.events.insert({
    calendarId,
    requestBody: {
      summary: 'TEST — safe to delete',
      description: 'Created by scripts/test-calendar.mjs',
      start: { dateTime: start.toISOString(), timeZone: CALENDAR_TIME_ZONE },
      end: { dateTime: end.toISOString(), timeZone: CALENDAR_TIME_ZONE },
    },
  })
  eventId = res.data.id
  console.log(`✅ INSERT  ${res.data.htmlLink}`)
} catch (err) {
  fail('INSERT failed — the bot can read the calendar but not write to it', err)
}

// --- Step 3: clean up so the shared calendar is not littered ---
try {
  await cal.events.delete({ calendarId, eventId })
  console.log('✅ DELETE  test event removed')
} catch (err) {
  fail(`DELETE failed — remove event ${eventId} by hand`, err)
}

console.log('\nGoogle Calendar bridge is working.')
