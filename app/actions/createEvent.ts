'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { generateAccessCode } from '@/lib/accessCode'
import crypto from 'crypto'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

export async function createEvent(input: {
  title: string
  location: string
  eventType: string
  createdByOfficer: string
  calendarStart: Date
  calendarEnd: Date
  checkInStart: Date
  checkInEnd: Date
  basePoints: number
  multiplier: number
  isRecurring: boolean
  weekCount: number
}) {
  // Authorize: server actions POST to their host route, so the /admin/* proxy
  // wall covers this — but verify the session here too rather than relying on
  // the proxy alone (per Next.js data-security guidance).
  const auth = await createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) throw new Error('Not authorized.')

  const supabase = createAdminClient()

  const recurrence_group_id = input.isRecurring ? crypto.randomUUID() : null

  const rows = Array.from({ length: input.weekCount }, (_, i) => ({
    title: input.title,
    location: input.location,
    event_type: input.eventType,
    created_by_officer: input.createdByOfficer,
    calendar_start: new Date(input.calendarStart.getTime() + i * WEEK_MS).toISOString(),
    calendar_end: new Date(input.calendarEnd.getTime() + i * WEEK_MS).toISOString(),
    check_in_start: new Date(input.checkInStart.getTime() + i * WEEK_MS).toISOString(),
    check_in_end: new Date(input.checkInEnd.getTime() + i * WEEK_MS).toISOString(),
    base_points: input.basePoints,
    multiplier: input.multiplier,
    access_code: generateAccessCode(),
    recurrence_group_id,
  }))

  const { error } = await supabase.from('events').insert(rows)
  if (error) throw new Error(error.message)
}
