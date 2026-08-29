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

export type Term = {
  /** "Fall 2025" — the same string `currentSeason` has always returned. */
  label: string
  /** First instant of the term, chapter-local midnight. */
  startsAt: Date
  /** First instant AFTER the term — the range is half-open, [startsAt, endsAt). */
  endsAt: Date
}

/**
 * The semester containing an instant, as a date range.
 *
 * Spring runs Jan–May, Summer Jun–Jul, Fall Aug–Dec, which is how the chapter
 * counts its semesters — the same rule `currentSeason` has always used for its
 * label, now shared so the label and the boundaries cannot drift apart.
 *
 * Boundaries are chapter-local midnights, not UTC ones. An event at 7pm on
 * December 31st belongs to the fall term, and it takes the zone-aware
 * conversion below to say so — `new Date('2026-01-01')` would parse as UTC and
 * pull the last six hours of December into spring.
 *
 * Half-open on purpose: an "end of term" that is itself inside the term forces
 * every caller to decide between `<=` and `<` on a timestamp, and one of them
 * will get it wrong for an event starting exactly at midnight.
 */
export function termBounds(now: Date = new Date()): Term {
  const parts = fmt({ year: 'numeric', month: 'numeric' }).formatToParts(now)
  const year = Number(parts.find((p) => p.type === 'year')!.value)
  const month = Number(parts.find((p) => p.type === 'month')!.value)

  const [term, startMonth, endMonth, endYear] =
    month <= 5
      ? (['Spring', 1, 6, year] as const)
      : month <= 7
        ? (['Summer', 6, 8, year] as const)
        : // Fall ends when January does — the term rolls over into next year.
          (['Fall', 8, 1, year + 1] as const)

  const midnight = (y: number, m: number) =>
    fromLocalInputValue(`${y}-${String(m).padStart(2, '0')}-01T00:00`)!

  return {
    label: `${term} ${year}`,
    startsAt: midnight(year, startMonth),
    endsAt: midnight(endYear, endMonth),
  }
}

/**
 * "Fall 2025" — the leaderboard season label. Spring runs Jan–May, Summer
 * Jun–Jul, Fall Aug–Dec, which is how the chapter counts its semesters.
 */
export function currentSeason(now: Date = new Date()): string {
  return termBounds(now).label
}

/** Greeting for the officer topbar, based on chapter-local time of day. */
export function greeting(now: Date = new Date()): string {
  const hour = Number(fmt({ hour: 'numeric', hour12: false }).format(now))
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/**
 * The chapter's UTC offset in milliseconds at a given instant, DST included.
 *
 * Derived by formatting the instant into chapter-local parts and reading them
 * back as if they were UTC — the gap between the two is the offset. This is the
 * standard trick, and it beats hard-coding -5/-6 because it stays correct
 * across the DST switch without a table.
 */
function zoneOffsetMs(at: Date): number {
  const parts = Object.fromEntries(
    fmt({
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(at)
      .map((p) => [p.type, p.value])
  )
  // `hour` comes back as 24 for midnight under hour12:false in some ICU
  // versions; % 24 normalizes it without disturbing any other hour.
  const asIfUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  )
  return asIfUtc - at.getTime()
}

/**
 * Stored timestamp → the `YYYY-MM-DDTHH:mm` a `datetime-local` input wants,
 * expressed as chapter-local wall time.
 *
 * This is what makes an edit form prefill with the same numbers the events
 * table displays. Reading the Date's own getHours() would instead show the
 * viewer's local time, which is a different number on any machine not set to
 * America/Chicago.
 */
export function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = Object.fromEntries(
    fmt({
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .formatToParts(d)
      .map((x) => [x.type, x.value])
  )
  const hour = String(Number(p.hour) % 24).padStart(2, '0')
  return `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}`
}

/**
 * The inverse: a `datetime-local` string, read as chapter-local wall time,
 * back to the instant it names.
 *
 * Two passes. The first guesses the offset by pretending the wall time is UTC;
 * that guess is wrong only when the guessed instant and the real one straddle a
 * DST boundary, so the second pass re-reads the offset at the corrected instant
 * and applies it. Times inside the skipped spring-forward hour don't exist and
 * settle on the instant just after the jump, which is the conventional result.
 */
export function fromLocalInputValue(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return null
  const asIfUtc = new Date(`${value.slice(0, 16)}:00Z`)
  if (Number.isNaN(asIfUtc.getTime())) return null

  const first = new Date(asIfUtc.getTime() - zoneOffsetMs(asIfUtc))
  const corrected = new Date(asIfUtc.getTime() - zoneOffsetMs(first))
  return corrected
}
