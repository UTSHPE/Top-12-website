/**
 * Isolated Google Calendar bridge check — runs OUTSIDE Next.js so an auth or
 * permission problem can be told apart from a framework/request problem.
 *
 * Usage:  node --env-file=.env.local scripts/test-calendar.mjs
 *
 * Reads everything from the environment. Never hardcode credentials here —
 * this repository is public.
 */
import { google } from 'googleapis';

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID;

// --- Step 0: environment shape (presence only, never key material) ---
console.log('client_email:', process.env.GOOGLE_CLIENT_EMAIL ?? 'MISSING');
console.log('calendar_id present:', Boolean(CALENDAR_ID));
console.log('private_key present:', Boolean(process.env.GOOGLE_PRIVATE_KEY));
console.log('private_key length:', process.env.GOOGLE_PRIVATE_KEY?.length);
console.log('has literal \\n:', process.env.GOOGLE_PRIVATE_KEY?.includes('\\n'));
console.log('has real newline:', process.env.GOOGLE_PRIVATE_KEY?.includes('\n'));
console.log('starts correctly:', process.env.GOOGLE_PRIVATE_KEY?.startsWith('-----BEGIN'));
console.log('');

const auth = new google.auth.JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/calendar'],
});

const cal = google.calendar({ version: 'v3', auth });

// --- Step A: does authentication work at all? ---
try {
  await auth.authorize();
  console.log('AUTH OK');
} catch (err) {
  console.error('AUTH FAILED:', err?.response?.data ?? err.message);
  process.exit(1);
}

// --- Step B: what calendars can this service account actually see? ---
const list = await cal.calendarList.list();
console.log('VISIBLE CALENDARS:');
console.log(
  (list.data.items ?? [])
    .map((c) => `  ${(c.accessRole ?? '?').padEnd(10)} ${c.summary} — ${c.id}`)
    .join('\n') || '  (none)'
);

// --- Step C: can it read the target calendar directly? ---
try {
  const meta = await cal.calendars.get({ calendarId: CALENDAR_ID });
  console.log('TARGET CALENDAR OK:', meta.data.summary, '| tz:', meta.data.timeZone);
} catch (err) {
  console.error('TARGET CALENDAR FAILED:', err?.response?.status, err?.response?.data ?? err.message);
  process.exit(1);
}

// --- Step D: can it write? ---
try {
  const res = await cal.events.insert({
    calendarId: CALENDAR_ID,
    requestBody: {
      summary: 'TEST — safe to delete',
      description: 'Created by scripts/test-calendar.mjs',
      start: { dateTime: '2026-09-14T18:00:00', timeZone: 'America/Chicago' },
      end: { dateTime: '2026-09-14T19:00:00', timeZone: 'America/Chicago' },
    },
  });
  console.log('INSERT OK');
  console.log('  event id:', res.data.id);
  console.log('  landed on:', res.data.organizer?.email);
  console.log('  link:', res.data.htmlLink);

  // Clean up after ourselves so the shared calendar is not littered.
  await cal.events.delete({ calendarId: CALENDAR_ID, eventId: res.data.id });
  console.log('  test event deleted');
} catch (err) {
  console.error('INSERT FAILED:', err?.response?.status, err?.response?.data ?? err.message);
}
