import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type Officer = {
  /** Display name — falls back to the email local-part if no roster row. */
  name: string
  /** First name only, for the dashboard greeting. */
  firstName: string
  /** Chapter position, e.g. "Events Officer". */
  role: string
  email: string
}

/**
 * The signed-in officer, enriched from the members roster.
 *
 * Only the Top 12 have accounts, so a session is itself proof of officer
 * status; the roster lookup is purely to put a real name and position in the
 * console chrome. Returns null when there's no session.
 */
export async function getOfficer(): Promise<Officer | null> {
  const auth = await createClient()
  const {
    data: { user },
  } = await auth.auth.getUser()

  if (!user?.email) return null

  const supabase = createAdminClient()
  const { data: member } = await supabase
    .from('members')
    .select('first_name, last_name, position')
    .eq('email', user.email)
    .maybeSingle()

  const rosterName = member ? `${member.first_name} ${member.last_name}`.trim() : ''
  const name = rosterName || user.email.split('@')[0]

  return {
    name,
    firstName: name.split(/\s+/)[0],
    role: member?.position || 'Officer',
    email: user.email,
  }
}
