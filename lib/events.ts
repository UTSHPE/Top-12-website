import { createAdminClient } from '@/lib/supabase/admin'

export type ChapterEvent = {
  id: string
  title: string
  location: string
  eventType: string
  host: string
  accessCode: string
  /** ISO strings — Dates don't survive the server/client boundary cleanly. */
  start: string
  end: string
  checkInStart: string
  checkInEnd: string
  basePoints: number
  multiplier: number
  /** What a member actually earns for showing up. */
  points: number
  /** True when a code typed right now would be accepted: in window AND enabled. */
  isOpen: boolean
  /**
   * The officer's manual switch, independent of the clock. `isOpen` is what
   * members experience; this is the toggle state the admin UI renders.
   */
  checkInEnabled: boolean
}

/**
 * The three visual registers an event can take. Every `event_type` the create
 * form offers maps onto one of them, so a new type added later still renders.
 */
export type CategoryKey = 'orange' | 'blue' | 'social'

export type CategoryStyle = {
  /** Uppercase label shown above the event title. */
  label: string
  /** Card top-block tint. */
  tint: string
  /** Solid date-chip / label color. */
  accent: string
  /** Perforation dash color, tuned to sit on the tint. */
  perforation: string
  /** Monogram / compact date-chip disc. */
  disc: string
  /** Muted meta text that still reads as part of the tinted block. */
  meta: string
  chipShadow: string
}

const CATEGORY_STYLES: Record<CategoryKey, Omit<CategoryStyle, 'label'>> = {
  orange: {
    tint: '#FBEEE2',
    accent: '#BF5700',
    perforation: '#E4DACA',
    disc: '#F5EFE6',
    meta: '#9A8B73',
    chipShadow: '0 4px 10px rgba(191,87,0,.3)',
  },
  blue: {
    tint: '#E9F0FB',
    accent: '#1F5FB8',
    perforation: '#D5DEEC',
    disc: '#EAF0FA',
    meta: '#8593A8',
    chipShadow: '0 4px 10px rgba(31,95,184,.3)',
  },
  social: {
    tint: '#EAF2F7',
    accent: '#4F87A8',
    perforation: '#CFDEE7',
    disc: '#E7F0F6',
    meta: '#7F94A1',
    chipShadow: '0 4px 10px rgba(79,135,168,.3)',
  },
}

/** Event types the create form offers, in the order officers see them. */
export const EVENT_TYPES = [
  'General Meeting',
  'Study Night',
  'Professional Development',
  'Social',
  'Community Service',
  'Other',
] as const

/** Filter chips on /events. "All" is prepended by the page itself. */
export const FILTERS = [
  'General Meeting',
  'Study Night',
  'Professional Development',
  'Social',
] as const

function categoryKey(eventType: string): CategoryKey {
  switch (eventType) {
    case 'Professional Development':
    case 'Study Night':
      return 'blue'
    case 'Social':
      return 'social'
    default:
      return 'orange'
  }
}

/** "Professional Development" reads as "Professional" on a card. */
function shortLabel(eventType: string): string {
  if (eventType === 'Professional Development') return 'Professional'
  return eventType || 'Event'
}

export function categoryStyle(eventType: string): CategoryStyle {
  return { label: shortLabel(eventType), ...CATEGORY_STYLES[categoryKey(eventType)] }
}

// Supabase row shape for the columns we select.
type EventRow = {
  id: string
  title: string
  location: string | null
  event_type: string | null
  created_by_officer: string | null
  access_code: string
  calendar_start: string
  calendar_end: string
  check_in_start: string
  check_in_end: string
  base_points: number
  multiplier: number
  is_open: boolean
}

const EVENT_COLUMNS =
  'id, title, location, event_type, created_by_officer, access_code, calendar_start, calendar_end, check_in_start, check_in_end, base_points, multiplier, is_open'

function toChapterEvent(row: EventRow, now: number): ChapterEvent {
  return {
    id: row.id,
    title: row.title,
    location: row.location ?? '',
    eventType: row.event_type ?? 'Other',
    host: row.created_by_officer ?? '',
    accessCode: row.access_code,
    start: row.calendar_start,
    end: row.calendar_end,
    checkInStart: row.check_in_start,
    checkInEnd: row.check_in_end,
    basePoints: Number(row.base_points),
    multiplier: Number(row.multiplier),
    points: Number(row.base_points) * Number(row.multiplier),
    // `is_open` can only close check-in early — it never extends the window,
    // which is why it's an AND rather than an override.
    isOpen:
      row.is_open !== false &&
      now >= new Date(row.check_in_start).getTime() &&
      now <= new Date(row.check_in_end).getTime(),
    checkInEnabled: row.is_open !== false,
  }
}

/** Everything that hasn't finished yet, soonest first — the /events grid. */
export async function getUpcomingEvents(limit = 24): Promise<ChapterEvent[]> {
  const supabase = createAdminClient()
  const now = new Date()

  const { data } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .is('deleted_at', null)
    .gte('calendar_end', now.toISOString())
    .order('calendar_start', { ascending: true })
    .limit(limit)

  return ((data ?? []) as EventRow[]).map((row) => toChapterEvent(row, now.getTime()))
}

/**
 * The event members can check into right now, if any. Drives the event name on
 * the check-in screen and the "Live right now" tile on the officer dashboard.
 */
export async function getOpenEvent(): Promise<ChapterEvent | null> {
  const supabase = createAdminClient()
  const now = new Date()
  const iso = now.toISOString()

  const { data } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .is('deleted_at', null)
    .eq('is_open', true)
    .lte('check_in_start', iso)
    .gte('check_in_end', iso)
    .order('check_in_start', { ascending: false })
    .limit(1)
    .maybeSingle()

  return data ? toChapterEvent(data as EventRow, now.getTime()) : null
}

export type EventWithAttendance = ChapterEvent & {
  headcount: number
  pointsAwarded: number
}

export type DashboardStats = {
  totalCheckIns: number
  pointsGiven: number
  eventsRun: number
  avgGeneralMeetingAttendance: number
  liveNow: { headcount: number; title: string } | null
  recent: EventWithAttendance[]
}

/**
 * One pass over events + sign-ins for the officer dashboard and analytics
 * table. Aggregating in memory keeps this to two round trips instead of a
 * query per event.
 */
export async function getDashboardStats(recentLimit = 8): Promise<DashboardStats> {
  const supabase = createAdminClient()
  const now = new Date()

  const [{ data: eventRows }, { data: signIns }] = await Promise.all([
    supabase
      .from('events')
      .select(EVENT_COLUMNS)
      .is('deleted_at', null)
      .order('calendar_start', { ascending: false }),
    supabase.from('sign_ins').select('event_id, points_earned').is('deleted_at', null),
  ])

  const headcounts = new Map<string, number>()
  const pointsByEvent = new Map<string, number>()
  for (const row of signIns ?? []) {
    headcounts.set(row.event_id, (headcounts.get(row.event_id) ?? 0) + 1)
    pointsByEvent.set(
      row.event_id,
      (pointsByEvent.get(row.event_id) ?? 0) + Number(row.points_earned)
    )
  }

  const events: EventWithAttendance[] = ((eventRows ?? []) as EventRow[]).map((row) => ({
    ...toChapterEvent(row, now.getTime()),
    headcount: headcounts.get(row.id) ?? 0,
    pointsAwarded: pointsByEvent.get(row.id) ?? 0,
  }))

  const generalMeetings = events.filter((e) => e.eventType === 'General Meeting')
  const avgGeneralMeetingAttendance = generalMeetings.length
    ? Math.round(
        generalMeetings.reduce((sum, e) => sum + e.headcount, 0) / generalMeetings.length
      )
    : 0

  const live = events.find((e) => e.isOpen) ?? null

  return {
    totalCheckIns: signIns?.length ?? 0,
    pointsGiven: [...pointsByEvent.values()].reduce((sum, n) => sum + n, 0),
    eventsRun: events.length,
    avgGeneralMeetingAttendance,
    liveNow: live ? { headcount: live.headcount, title: live.title } : null,
    recent: events.slice(0, recentLimit),
  }
}

/** Full history for the analytics table. */
export async function getAllEventsWithAttendance(): Promise<EventWithAttendance[]> {
  const { recent } = await getDashboardStats(Number.MAX_SAFE_INTEGER)
  return recent
}
