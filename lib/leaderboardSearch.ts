import type { LeaderboardEntry } from '@/lib/leaderboard'

/**
 * The leaderboard's search, kept apart from both the query layer and the UI.
 *
 * Deliberately its own module rather than living in lib/leaderboard.ts: that
 * file imports the service-role Supabase client, and the search box is a client
 * component. Importing one from the other would drag the admin client into the
 * browser bundle. Nothing here touches the network, so it is safe on both
 * sides — and testable without a DOM.
 */

/**
 * One board row, with the EID removed.
 *
 * The board is filtered in the browser, so whatever the search component
 * receives is serialized into the page payload and readable by anyone who views
 * source. EIDs are student identifiers and the member leaderboard is public, so
 * they are dropped on the server and never cross the boundary — `isMe` is
 * resolved there too, which is the only thing the EID was needed for.
 */
export type PublicEntry = Omit<LeaderboardEntry, 'eid'> & { isMe: boolean }

/**
 * Strip the board down to what the browser is allowed to see.
 *
 * Kept next to the type it produces so the two cannot drift — adding a column
 * to LeaderboardEntry will not silently start leaking it, because the omission
 * is by name rather than by listing what to keep.
 */
export function toPublicEntries(
  board: LeaderboardEntry[],
  myEid?: string | null
): PublicEntry[] {
  return board.map(({ eid, ...rest }) => ({
    ...rest,
    isMe: Boolean(myEid) && eid === myEid,
  }))
}

/**
 * Fold accents and case so a search matches what people actually type.
 *
 * The roster is full of names like "María José Hernández Peña", and nobody
 * types the accents into a search box. NFD splits each accented character into
 * its base letter plus a combining mark, and the mark is then dropped — so
 * "maria jose" finds her, and so does "María José".
 */
export function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

/** Name, major and class year — exactly the three things a row displays. */
function haystack(entry: PublicEntry): string {
  return fold([entry.name, entry.major, entry.classYear].filter(Boolean).join(' '))
}

/**
 * Rows matching a query, in the board's existing rank order.
 *
 * Every whitespace-separated term has to match somewhere, so "civil junior"
 * narrows to civil engineering juniors rather than widening to everyone who is
 * either. Terms match anywhere in the string, not just at a word boundary, so
 * a partial surname still finds someone.
 *
 * A blank query returns null rather than the whole list, so callers can tell
 * "not searching" apart from "searched and matched everything" — they render
 * differently.
 */
export function searchEntries(
  entries: PublicEntry[],
  query: string
): PublicEntry[] | null {
  const trimmed = query.trim()
  if (!trimmed) return null

  const terms = fold(trimmed).split(/\s+/)
  return entries.filter((entry) => {
    const hay = haystack(entry)
    return terms.every((term) => hay.includes(term))
  })
}
