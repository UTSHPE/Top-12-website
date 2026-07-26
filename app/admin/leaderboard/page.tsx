import { getLeaderboard } from '@/lib/leaderboard'
import { currentSeason } from '@/lib/format'
import Podium from '@/components/Podium'
import LeaderboardRow from '@/components/LeaderboardRow'
import AdminTopbar from '@/app/admin/AdminTopbar'
import { LiveDot } from '@/components/StatusPill'

export const revalidate = 0

/**
 * The chapter board as officers see it: the same podium and rows as the member
 * page, but inside the console shell and without the "you" row — an officer is
 * looking at the chapter here, not at their own standing.
 */
export default async function AdminLeaderboardPage() {
  const board = await getLeaderboard()

  const podium = board.slice(0, 3)
  const rows = board.slice(3)

  return (
    <>
      <AdminTopbar
        title="Leaderboard"
        subtitle={`${currentSeason()} · ${board.length} ${
          board.length === 1 ? 'member' : 'members'
        } on the board`}
      />

      <div className="min-w-0 flex-1 px-5 py-6 md:px-7">
        <div className="mx-auto max-w-[720px]">
          <div className="overflow-hidden rounded-lg bg-ink px-5 pt-[26px] pb-[30px] text-white shadow-card sm:px-[30px]">
            <div className="mb-[22px] flex items-center justify-between gap-4">
              <h2 className="font-display text-xl font-extrabold tracking-[-.5px]">
                Top of the chapter
              </h2>
              <span className="flex items-center gap-[7px] text-xs text-[#C7BCAE]">
                <LiveDot className="size-[7px] bg-[#3DDC84]" />
                live
              </span>
            </div>

            {podium.length > 0 ? (
              <Podium entries={podium} />
            ) : (
              <p className="py-6 text-center text-sm text-[#C7BCAE]">
                No points earned yet — once members check in they show up here.
              </p>
            )}
          </div>

          {rows.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {rows.map((entry) => (
                <LeaderboardRow key={entry.eid} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
