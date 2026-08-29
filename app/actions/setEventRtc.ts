'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Mark or unmark a single event as counting toward RTC.
 *
 * Deliberately its own action rather than a field on updateEvent, because it
 * deliberately has NO "upcoming only" gate. Every other editable property of an
 * event is frozen once it starts — moving the time of an event people already
 * attended would rewrite history. RTC is the opposite case: the mistake it
 * fixes is only ever discovered afterwards, when the attendance tally comes up
 * short and someone realizes the box was never ticked in September. Refusing
 * the correction would mean the count stays wrong permanently.
 *
 * Nothing downstream of this touches points. `sign_ins.points_earned` is
 * written once at check-in from the event's base points and multiplier, and is
 * never recomputed — so flipping this flag months later changes the RTC report
 * and nothing else. The leaderboard never reads it.
 */
export async function setEventRtc(eventId: string, isRtc: boolean): Promise<void> {
  // Same belt-and-braces authorization as every other event action: the /admin
  // proxy wall covers this, but a server action is a public endpoint.
  const auth = await createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) throw new Error('Not authorized.')

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('events')
    .update({ is_rtc: isRtc })
    .eq('id', eventId)
    .is('deleted_at', null)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/events')
  revalidatePath('/admin')
}
