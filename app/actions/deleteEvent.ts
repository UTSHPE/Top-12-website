'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export type DeleteEventResult = { deletedSignIns: number }

/**
 * Soft-delete an event and every check-in recorded against it.
 *
 * Deleting an event takes points history down with it and silently reorders
 * the leaderboard, so nothing is actually removed — both the event and its
 * `sign_ins` rows get a `deleted_at` stamp and drop out of every read. See
 * docs/migrations/004_soft_delete.sql for how to restore or purge.
 *
 * The child rows are stamped too, rather than being filtered through a join:
 * lib/leaderboard.ts aggregates `sign_ins` on its own and never touches
 * `events`, so an unstamped row would keep awarding points for a deleted event.
 *
 * NOTE: this deliberately does not touch the Google Calendar entry. Leaving it
 * in place is the intended behavior.
 */
export async function deleteEvent(
  eventId: string,
  /** Must match the event title exactly — the officer types it to confirm. */
  confirmation: string
): Promise<DeleteEventResult> {
  // Same belt-and-braces authorization as createEvent: the /admin proxy wall
  // already covers this, but verify the session here rather than relying on it.
  const auth = await createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()
  if (!user) throw new Error('Not authorized.')

  const supabase = createAdminClient()

  const { data: event, error: lookupError } = await supabase
    .from('events')
    .select('id, title')
    .eq('id', eventId)
    .is('deleted_at', null)
    .maybeSingle()

  if (lookupError) throw new Error(lookupError.message)
  if (!event) throw new Error('That event no longer exists.')

  // Re-check the typed confirmation on the server. The client already gates the
  // button on it, but a server action is a public endpoint.
  if (confirmation.trim() !== event.title.trim()) {
    throw new Error('The name you typed does not match this event.')
  }

  const deletedAt = new Date().toISOString()

  const { data: removed, error: signInError } = await supabase
    .from('sign_ins')
    .update({ deleted_at: deletedAt })
    .eq('event_id', eventId)
    .is('deleted_at', null)
    .select('id')

  if (signInError) throw new Error(signInError.message)

  const { error: eventError } = await supabase
    .from('events')
    .update({ deleted_at: deletedAt })
    .eq('id', eventId)

  // The check-ins are already stamped at this point. Surface the failure loudly
  // rather than leaving the officer thinking the delete worked.
  if (eventError) throw new Error(eventError.message)

  revalidatePath('/admin/events')
  revalidatePath('/admin')
  revalidatePath('/events')
  revalidatePath('/leaderboard')

  return { deletedSignIns: removed?.length ?? 0 }
}
