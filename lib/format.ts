// Every date in the app is displayed in the chapter's local time. Pinning the
// zone (rather than letting the runtime pick) keeps a server-rendered date
// identical to the one the browser would render, so nothing shifts on hydration
// and a deploy running in UTC doesn't push evening events onto the wrong day.
const TZ = 'America/Chicago'

const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...options })

const monthShort = fmt({ month: 'short' })
const dayNum = fmt({ day: 'numeric' })
const weekdayShort = fmt({ weekday: 'short' })
const timeShort = fmt({ hour: 'numeric', minute: '2-digit' })
const dateShort = fmt({ month: 'short', day: 'numeric' })
const dateLong = fmt({ month: 'short', day: 'numeric', year: 'numeric' })

/** "SEP" — the date chip eyebrow. */
export const formatMonth = (iso: string) => monthShort.format(new Date(iso)).toUpperCase()

/** "16" — the date chip number. */
export const formatDay = (iso: string) => dayNum.format(new Date(iso))

/** "Tue · 6:30 PM" */
export const formatDayTime = (iso: string) => {
  const d = new Date(iso)
  return `${weekdayShort.format(d)} · ${timeShort.format(d)}`
}

/** "6:30 PM" */
export const formatTime = (iso: string) => timeShort.format(new Date(iso))

/** "Sep 16" */
export const formatDate = (iso: string) => dateShort.format(new Date(iso))

/** "Sep 16, 2025" */
export const formatDateLong = (iso: string) => dateLong.format(new Date(iso))

/** Point totals are `base × multiplier`, so they can land on a half. */
export const formatPoints = (points: number) =>
  Number.isInteger(points) ? String(points) : points.toFixed(1)

/**
 * "Fall 2025" — the leaderboard season label. Spring runs Jan–May, Summer
 * Jun–Jul, Fall Aug–Dec, which is how the chapter counts its semesters.
 */
export function currentSeason(now: Date = new Date()): string {
  const parts = fmt({ year: 'numeric', month: 'numeric' }).formatToParts(now)
  const year = parts.find((p) => p.type === 'year')!.value
  const month = Number(parts.find((p) => p.type === 'month')!.value)
  const term = month <= 5 ? 'Spring' : month <= 7 ? 'Summer' : 'Fall'
  return `${term} ${year}`
}

/** Greeting for the officer topbar, based on chapter-local time of day. */
export function greeting(now: Date = new Date()): string {
  const hour = Number(fmt({ hour: 'numeric', hour12: false }).format(now))
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
