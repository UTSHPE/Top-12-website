import { createAdminClient } from '@/lib/supabase/admin'

/**
 * The committees a link can belong to. Must stay in sync with the CHECK
 * constraint in docs/migrations/009 — this union is what picks a row's dot
 * color, and the constraint is what stops a typo reaching the panel.
 */
export const COMMITTEES = ['Treasurer', 'VPI', 'Secretary', 'Chapter Development'] as const

export type Committee = (typeof COMMITTEES)[number]

export type ImportantLink = {
  id: string
  name: string
  href: string
  committee: Committee
  /** Null when the link needs no explanation — the row renders shorter. */
  purpose: string | null
}

/**
 * Officer resource links for the dashboard panel.
 *
 * Server-only. `important_links` has RLS enabled with no policy, so the anon
 * key — which ships in the browser bundle — reads nothing; this must run
 * through the service-role client in a Server Component or action. That is the
 * only thing keeping these URLs off the public web, so never fetch this table
 * from a client component.
 */
export async function getImportantLinks(): Promise<ImportantLink[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('important_links')
    .select('id, name, href, committee, purpose')
    .order('sort_order', { ascending: true })

  // The other helpers here swallow errors and return `data ?? []`, which is
  // what makes a missing migration render as an empty panel instead of a
  // failure (see docs/migrations/README.md). Same shape, but logged — an empty
  // "Important links" card is otherwise indistinguishable from an unseeded one.
  if (error) {
    console.error(`important_links query failed: ${error.message}`)
    return []
  }

  return (data ?? []) as ImportantLink[]
}
