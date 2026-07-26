import { createAdminClient } from '@/lib/supabase/admin'

export type LeaderboardEntry = {
  eid: string
  name: string
  major: string | null
  classYear: string | null
  points: number
  /** Standard competition ranking — ties share a rank, the next rank skips. */
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

  const [{ data: signIns }, { data: members }] = await Promise.all([
    supabase.from('sign_ins').select('eid, points_earned'),
    supabase.from('members').select('eid, first_name, last_name, major, Class'),
  ])

  // eid -> total points earned
  const totals = new Map<string, number>()
  for (const row of signIns ?? []) {
    totals.set(row.eid, (totals.get(row.eid) ?? 0) + Number(row.points_earned))
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

  const sorted = [...totals.entries()]
    .map(([eid, points]) => {
      const profile = profiles.get(eid)
      return {
        eid,
        points,
        // Fall back to the raw eid so an orphaned sign-in still shows up.
        name: profile?.name || eid,
        major: profile?.major ?? null,
        classYear: profile?.classYear ?? null,
      }
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))

  let lastPoints: number | null = null
  let lastRank = 0

  return sorted.map((entry, i) => {
    const rank = entry.points === lastPoints ? lastRank : i + 1
    lastPoints = entry.points
    lastRank = rank
    return { ...entry, rank }
  })
}

/** Where a single member currently sits, or null if they have no points yet. */
export async function getRankFor(eid: string): Promise<number | null> {
  const board = await getLeaderboard()
  return board.find((entry) => entry.eid === eid)?.rank ?? null
}
