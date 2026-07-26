import Link from 'next/link'
import { FaArrowRight, FaCalendarDay, FaLocationArrow, FaRankingStar } from 'react-icons/fa6'
import { getOpenEvent, getUpcomingEvents } from '@/lib/events'
import { getLeaderboard } from '@/lib/leaderboard'
import { currentSeason } from '@/lib/format'
import MemberNav from '@/components/MemberNav'
import EventCard from '@/components/EventCard'
import { LiveDot } from '@/components/StatusPill'

export const revalidate = 0

// The design covers check-in, events and the leaderboard; this landing exists
// so the "Home" nav item has somewhere to go, and deliberately just points at
// those three screens using the same vocabulary.
export default async function Home() {
  const [openEvent, upcoming, board] = await Promise.all([
    getOpenEvent(),
    getUpcomingEvents(3),
    getLeaderboard(),
  ])

  const next = upcoming.filter((event) => event.id !== openEvent?.id).slice(0, 3)

  return (
    <>
      <MemberNav />

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-8 sm:px-[30px] sm:py-10">
        <section className="relative overflow-hidden rounded-xl bg-primary p-8 text-white sm:p-11">
          <FaLocationArrow
            aria-hidden
            className="pointer-events-none absolute -right-10 -bottom-16 text-[220px] text-white/8"
          />
          <div className="relative">
            <p className="mb-3 text-[13px] font-bold tracking-[.08em] text-white/80 uppercase">
              {currentSeason()} · UT SHPE
            </p>
            <h1 className="font-display max-w-[16ch] text-[34px] leading-[1.05] font-extrabold tracking-[-1px] sm:text-[44px]">
              You showed up. Let&apos;s log it.
            </h1>
            <p className="mt-3.5 max-w-[46ch] text-base leading-relaxed text-white/90">
              Scan the check-in code at a chapter event to earn points. They land on
              the board the moment you do.
            </p>

            {openEvent && (
              <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold">
                <LiveDot className="size-1.5 bg-[#8FE3C9]" />
                {openEvent.title} is open for check-in
              </p>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/leaderboard"
                className="flex items-center gap-2.5 rounded-md bg-white px-6 py-3.5 font-bold text-primary"
              >
                See the leaderboard <FaArrowRight aria-hidden className="size-3.5" />
              </Link>
              <Link
                href="/events"
                className="rounded-md bg-white/15 px-6 py-3.5 font-semibold text-white"
              >
                Browse events
              </Link>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/events"
            className="lift flex items-center gap-4 rounded-lg bg-surface p-5 shadow-card"
          >
            <span className="flex size-11 flex-none items-center justify-center rounded-md bg-tint-orange text-primary">
              <FaCalendarDay aria-hidden className="size-[18px]" />
            </span>
            <span>
              <span className="font-display block text-base font-extrabold">
                Upcoming events
              </span>
              <span className="text-sm text-muted">
                {upcoming.length} on the calendar
              </span>
            </span>
          </Link>

          <Link
            href="/leaderboard"
            className="lift flex items-center gap-4 rounded-lg bg-surface p-5 shadow-card"
          >
            <span className="flex size-11 flex-none items-center justify-center rounded-md bg-tint-blue text-secondary">
              <FaRankingStar aria-hidden className="size-[18px]" />
            </span>
            <span>
              <span className="font-display block text-base font-extrabold">
                Chapter leaderboard
              </span>
              <span className="text-sm text-muted">
                {board.length} members on the board
              </span>
            </span>
          </Link>
        </section>

        {next.length > 0 && (
          <section className="mt-10">
            <h2 className="font-display mb-4 text-xl font-extrabold tracking-[-.4px]">
              Coming up
            </h2>
            <div className="grid gap-[18px] md:grid-cols-2 xl:grid-cols-3">
              {next.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  )
}
