'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Open or close check-in for a single event, independent of the clock.
 *
 * This is the switch an officer hits when the meeting ends early or someone
 * photographed the slide. Closing takes effect immediately; re-opening only
 * restores the event's existing `check_in_start`/`check_in_end` window, so a
 * code from three weeks ago stays dead no matter what this is set to.
 */
export async function setCheckInOpen(eventId: string, isOpen: boolean): Promise<void> {
  const auth = await createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) throw new Error('Not authorized.')

  const supabase = createAdminClient()

  const { error } = await supabase
    .from('events')
    .update({ is_open: isOpen })
    .eq('id', eventId)
    .is('deleted_at', null)

  if (error) throw new Error(error.message)

  revalidatePath('/admin/events')
  revalidatePath('/admin')
  revalidatePath('/checkin')
}
