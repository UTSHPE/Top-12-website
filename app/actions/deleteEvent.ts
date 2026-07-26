'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/**
 * Permanently delete an event and every check-in recorded against it.
 *
 * This destroys points history, so it is meant for clearing out test events —
 * the caller is responsible for confirming with the officer first.
 */
export async function deleteEvent(eventId: string): Promise<{ deletedSignIns: number }> {
  // Same belt-and-braces authorization as createEvent: the /admin proxy wall
  // already covers this, but verify the session here rather than relying on it.
  const auth = await createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) throw new Error('Not authorized.')

  const supabase = createAdminClient()

  // Clear the child rows first. sign_ins.event_id references events.id, so this
  // works whether or not the constraint is set to cascade.
  const { data: removed, error: signInError } = await supabase
    .from('sign_ins')
    .delete()
    .eq('event_id', eventId)
    .select('id')

  if (signInError) throw new Error(signInError.message)

  const { error: eventError } = await supabase.from('events').delete().eq('id', eventId)
  if (eventError) throw new Error(eventError.message)

  revalidatePath('/admin/events')
  revalidatePath('/admin')
  revalidatePath('/events')
  revalidatePath('/leaderboard')

  return { deletedSignIns: removed?.length ?? 0 }
}
