import { createAdminClient } from '@/lib/supabase/admin'

export type LeaderboardEntry = {
  eid: string
  name: string
  major: string | null
  classYear: string | null
  points: number
  /** Dense, unique position on the board — 1, 2, 3, 4… with no shared ranks. */
  rank: number
}

/**
 * Aggregate every sign-in into a ranked board.
 *
 * Runs with the service-role client, so this must only ever be called from the
 * server. Callers receive rank/name/major/points — never raw member rows.
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  const supabase = createAdminClient()

  // Soft-deleted check-ins are stamped when their event is deleted, so this
  // single filter is what keeps a deleted event's points off the board.
  const [{ data: signIns }, { data: members }] = await Promise.all([
    supabase
      .from('sign_ins')
      .select('eid, points_earned, created_at')
      .is('deleted_at', null),
    supabase.from('members').select('eid, first_name, last_name, major, Class'),
  ])

  // eid -> total points earned, and when that total was last added to.
  const totals = new Map<string, number>()
  const lastEarnedAt = new Map<string, number>()
  for (const row of signIns ?? []) {
    totals.set(row.eid, (totals.get(row.eid) ?? 0) + Number(row.points_earned))
    // created_at is the check-in timestamp; a bad value sorts as "just now".
    const at = Date.parse(row.created_at as string)
    const stamp = Number.isNaN(at) ? Date.now() : at
    lastEarnedAt.set(row.eid, Math.max(lastEarnedAt.get(row.eid) ?? 0, stamp))
  }

  const profiles = new Map(
    (members ?? []).map((m) => [
      m.eid,
      {
        name: `${m.first_name} ${m.last_name}`.trim(),
        major: (m.major as string | null) ?? null,
        classYear: (m.Class as string | null) ?? null,
      },
    ])
  )

  // Every roster member is on the board, whether or not they have ever checked
  // in. Building from `totals` alone meant the board was empty until the first
  // check-in of the semester, which reads as broken rather than as "nobody has
  // scored yet" — and a member who has not scored still wants to find their own
  // name on it.
  //
  // Unioned with the sign-in EIDs rather than taken from the roster alone, so
  // an orphaned check-in still surfaces. The foreign key on `sign_ins.eid`
  // should make that impossible; this fallback predates it and costs nothing.
  const eids = new Set<string>([...profiles.keys(), ...totals.keys()])

  const sorted = [...eids]
    .map((eid) => {
      const profile = profiles.get(eid)
      return {
        eid,
        // No check-ins is a real zero, not a missing value.
        points: totals.get(eid) ?? 0,
        // Fall back to the raw eid so an orphaned sign-in still shows up.
        name: profile?.name || eid,
        major: profile?.major ?? null,
        classYear: profile?.classYear ?? null,
      }
    })
    // Every position is unique: most points first, and when two members are
    // level the one who got there first stays ahead. (Name is only a last
    // resort for the same points at the same millisecond.)
    //
    // Members who have never checked in have no timestamp, so they all fall
    // through to the name comparison and sort alphabetically at the bottom.
    // That is stable between loads, which matters — a board that reshuffles its
    // zero-point tail on every refresh looks broken.
    .sort(
      (a, b) =>
        b.points - a.points ||
        (lastEarnedAt.get(a.eid) ?? 0) - (lastEarnedAt.get(b.eid) ?? 0) ||
        a.name.localeCompare(b.name)
    )

  return sorted.map((entry, i) => ({ ...entry, rank: i + 1 }))
}

/**
 * Where a single member currently sits.
 *
 * Null now means "not on the roster and never checked in" — every roster member
 * has a rank, including those on zero. Callers that previously read null as
 * "no points yet" would be wrong; check `points` for that.
 */
export async function getRankFor(eid: string): Promise<number | null> {
  const board = await getLeaderboard()
  return board.find((entry) => entry.eid === eid)?.rank ?? null
}
