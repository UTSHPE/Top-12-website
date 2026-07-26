'use server'

import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRankFor } from '@/lib/leaderboard'
import { EID_COOKIE, EID_COOKIE_MAX_AGE } from '@/lib/memberSession'

export type CheckInError =
  | 'invalid_code'
  | 'window_closed'
  | 'member_not_found'
  | 'already_signed_in'

export type CheckInResult =
  | {
      success: true
      points: number
      eventName: string
      /** Position on the board after this check-in, if it could be computed. */
      rank: number | null
    }
  | { success: false; error: CheckInError }

export async function checkIn({
  eid,
  accessCode,
}: {
  eid: string
  accessCode: string
}): Promise<CheckInResult> {
  const supabase = createAdminClient()

  // Step 1 — find the event by access code
  const { data: event } = await supabase
    .from('events')
    .select('id, title, check_in_start, check_in_end, base_points, multiplier')
    .eq('access_code', accessCode)
    .single()

  if (!event) return { success: false, error: 'invalid_code' }

  // Step 2 — check the time window (server-side only)
  const now = new Date()
  const withinWindow =
    now >= new Date(event.check_in_start) && now <= new Date(event.check_in_end)

  if (!withinWindow) return { success: false, error: 'window_closed' }

  // Step 3 — verify the member exists
  const { data: member } = await supabase
    .from('members')
    .select('eid')
    .eq('eid', eid)
    .single()

  if (!member) return { success: false, error: 'member_not_found' }

  // Step 4 — check for duplicate sign-in
  const { data: existing } = await supabase
    .from('sign_ins')
    .select('id')
    .eq('eid', eid)
    .eq('event_id', event.id)
    .maybeSingle()

  if (existing) return { success: false, error: 'already_signed_in' }

  // Step 5 — insert the sign-in record
  const points_earned = event.base_points * event.multiplier

  const { error: insertError } = await supabase.from('sign_ins').insert({
    eid,
    event_id: event.id,
    points_earned,
  })

  if (insertError) throw insertError

  // Remember who this is, so the leaderboard can show them their own rank.
  const cookieStore = await cookies()
  cookieStore.set(EID_COOKIE, eid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: EID_COOKIE_MAX_AGE,
  })

  return {
    success: true,
    points: points_earned,
    eventName: event.title,
    rank: await getRankFor(eid),
  }
}
