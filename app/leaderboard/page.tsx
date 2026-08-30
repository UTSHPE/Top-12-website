import { cookies } from 'next/headers'
import { EID_COOKIE } from '@/lib/memberSession'
import { getLeaderboard } from '@/lib/leaderboard'
import { currentSeason, formatPoints } from '@/lib/format'
import MemberNav from '@/components/MemberNav'
import Podium from '@/components/Podium'
import LeaderboardRow from '@/components/LeaderboardRow'
import { LiveDot } from '@/components/StatusPill'

// Always render fresh — the leaderboard should reflect the latest check-ins.
export const revalidate = 0

/** How far down the board we list before it stops being interesting. */
const VISIBLE_ROWS = 12

export default async function LeaderboardPage() {
  const [board, cookieStore] = await Promise.all([getLeaderboard(), cookies()])

  // There's no member login — the only thing the app knows about the visitor is
  // the EID their last successful check-in left behind.
  const myEid = cookieStore.get(EID_COOKIE)?.value
  const me = myEid ? (board.find((entry) => entry.eid === myEid) ?? null) : null

  // Only a member who has actually scored can take a podium place. The board
  // now lists everyone on the roster, so slicing the top three off an all-zero
  // board would hand a gold medal to whoever sorts first alphabetically and
  // invent a winner out of nothing.
  const podium = board.filter((entry) => entry.points > 0).slice(0, 3)
  const rows = board.slice(podium.length, podium.length + VISIBLE_ROWS)

  // If they're outside the listed window, pin their row to the end so they can
  // always see where they stand.
  const pinMe =
    me !== null &&
    !podium.some((p) => p.eid === me.eid) &&
    !rows.some((r) => r.eid === me.eid)

  return (
    <>
      <MemberNav />

      <main className="flex-1 pb-28 md:pb-8">
        <header className="bg-ink px-5 pt-[26px] pb-[30px] text-white sm:px-[30px]">
          <div className="mx-auto max-w-[720px]">
            <div className="mb-[22px] flex items-center justify-between gap-4">
              <h1 className="font-display text-2xl font-extrabold tracking-[-.5px] sm:text-[26px]">
                Leaderboard
              </h1>
              <span className="flex items-center gap-[7px] text-xs text-[#C7BCAE]">
                <LiveDot className="size-[7px] bg-[#3DDC84]" />
                {currentSeason()} · live
              </span>
            </div>

            {podium.length > 0 ? (
              <Podium entries={podium} />
            ) : (
              <p className="py-6 text-center text-sm text-[#C7BCAE]">
                No points earned yet — check in at an event to claim the top spot.
              </p>
            )}
          </div>
        </header>

        <div className="mx-auto flex max-w-[720px] flex-col gap-2 px-5 pt-4 pb-6 sm:px-5">
          {rows.map((entry) => (
            <LeaderboardRow
              key={entry.eid}
              entry={entry}
              isMe={entry.eid === me?.eid}
            />
          ))}
          {pinMe && me && <LeaderboardRow entry={me} isMe />}
        </div>
      </main>

      {/* Phone: your standing stays in view without scrolling for it. */}
      {me && (
        <div className="fixed inset-x-0 bottom-0 flex items-center gap-3 bg-primary px-[18px] pt-3.5 pb-[22px] text-white md:hidden">
          <div className="font-display w-[26px] text-center text-[15px] font-extrabold">
            {me.rank}
          </div>
          <span className="flex size-[34px] flex-none items-center justify-center rounded-full bg-white/20 text-[11px] font-bold">
            You
          </span>
          <div className="flex-1">
            <div className="text-sm font-bold">Your rank</div>
            <div className="text-[11px] opacity-85">Keep checking in!</div>
          </div>
          <div className="font-display text-base font-extrabold">
            {formatPoints(me.points)}
          </div>
        </div>
      )}
    </>
  )
}
