import { getLeaderboard } from '@/lib/leaderboard'
import { currentSeason } from '@/lib/format'
import Podium from '@/components/Podium'
import LeaderboardSearch from '@/components/LeaderboardSearch'
import { toPublicEntries } from '@/lib/leaderboardSearch'
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

  // Only a member who has actually scored can take a podium place — see the
  // member-facing page for why. Everyone else lists below, zeros included.
  const podium = board.filter((entry) => entry.points > 0).slice(0, 3)

  // No `myEid`: an officer is looking at the chapter here, not at their own
  // standing, so no row is highlighted. EIDs are stripped for the same reason
  // as on the member page — the browser does the filtering and does not need
  // them. No row cap either; officers scan the whole roster.
  const entries = toPublicEntries(board)

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
                No points earned yet — the podium fills in once members start checking in.
              </p>
            )}
          </div>

          {entries.length > podium.length && (
            <div className="mt-4">
              <LeaderboardSearch entries={entries} podiumCount={podium.length} />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
