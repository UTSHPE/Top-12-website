import { createAdminClient } from '@/lib/supabase/admin'

// Always render fresh — the leaderboard should reflect the latest check-ins.
export const revalidate = 0

// Reads run with the service-role client, which stays server-side only (this is
// a Server Component). It bypasses RLS so the anon role doesn't need read
// policies, and the browser only ever receives the rendered rank/name/points —
// never raw member rows (email, DOB, etc.).

const MEDALS = ['🥇', '🥈', '🥉']

export default async function LeaderboardPage() {
  const supabase = createAdminClient()

  const [{ data: signIns }, { data: members }] = await Promise.all([
    supabase.from('sign_ins').select('eid, points_earned'),
    supabase.from('members').select('eid, first_name, last_name'),
  ])

  // eid -> total points earned
  const totals = new Map<string, number>()
  for (const row of signIns ?? []) {
    totals.set(row.eid, (totals.get(row.eid) ?? 0) + Number(row.points_earned))
  }

  // eid -> display name (fall back to raw eid for orphaned sign-ins)
  const names = new Map(
    (members ?? []).map((m) => [m.eid, `${m.first_name} ${m.last_name}`])
  )

  const ranked = [...totals.entries()]
    .map(([eid, points]) => ({ eid, points, name: names.get(eid) ?? eid }))
    .sort((a, b) => b.points - a.points)

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Chapter Leaderboard</h1>
          <p className="mt-2 text-sm text-gray-500">
            Points earned from event check-ins
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow-md">
          {ranked.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm text-gray-500">
              No points earned yet — check in at an event to get on the board.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {ranked.map((entry, i) => (
                <li
                  key={entry.eid}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div className="flex items-center gap-4">
                    <span className="w-8 text-center text-lg font-semibold text-gray-400">
                      {MEDALS[i] ?? i + 1}
                    </span>
                    <span className="font-medium text-gray-900">{entry.name}</span>
                  </div>
                  <span className="font-semibold text-orange-600">
                    {entry.points} pts
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
