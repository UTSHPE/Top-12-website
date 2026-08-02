import type { ChapterEvent } from '@/lib/events'
import { formatPointsLabel } from '@/lib/format'

/**
 * "Add to Google Calendar" links for members.
 *
 * This is just a URL built from columns we already have — no API, no OAuth, no
 * service account. It is unrelated to (and unaffected by) the officer-side
 * Calendar sync, so it keeps working regardless of that key's state.
 */

/** Google wants UTC basic-format stamps: "20260801T183000Z". */
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]|\.\d{3}/g, '')

export function googleCalendarUrl(event: ChapterEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${stamp(event.start)}/${stamp(event.end)}`,
    details: `UT SHPE ${event.eventType} — worth ${formatPointsLabel(
      event.points
    )}. Check in at the event to earn them.`,
  })

  if (event.location) params.set('location', event.location)

  return `https://calendar.google.com/calendar/render?${params}`
}
