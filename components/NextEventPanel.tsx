import Link from 'next/link'
import { FaArrowRight, FaLocationArrow, FaLocationDot, FaRegClock } from 'react-icons/fa6'
import type { ChapterEvent } from '@/lib/events'
import { formatDateLong, formatPointsLabel, formatTime, whenLabel } from '@/lib/format'
import { LiveDot } from '@/components/StatusPill'
import AddToCalendarLink from '@/components/AddToCalendarLink'

const SHELL =
  'relative overflow-hidden rounded-xl bg-primary p-8 text-white sm:p-11'

const EYEBROW = 'mb-3 flex items-center gap-2 text-[13px] font-bold tracking-[.08em] uppercase'

/**
 * The top of the home page: the one event a member needs to know about right
 * now. Shows the open check-in window if there is one, otherwise the next thing
 * on the calendar. This replaced a static slogan — the panel earns its space by
 * carrying the date, place and points rather than describing the app.
 */
export default function NextEventPanel({ event }: { event: ChapterEvent | null }) {
  return (
    <section className={SHELL}>
      <FaLocationArrow
        aria-hidden
        className="pointer-events-none absolute -right-10 -bottom-16 text-[220px] text-white/8"
      />
      <div className="relative">{event ? <Details event={event} /> : <Empty />}</div>
    </section>
  )
}

function Details({ event }: { event: ChapterEvent }) {
  return (
    <>
      <p className={`${EYEBROW} text-white/80`}>
        {event.isOpen ? (
          <>
            <LiveDot className="size-1.5 bg-[#8FE3C9]" />
            Check-in open now
          </>
        ) : (
          <>Next up · {whenLabel(event.start)}</>
        )}
      </p>

      <h1 className="font-display max-w-[18ch] text-[34px] leading-[1.05] font-extrabold tracking-[-1px] sm:text-[44px]">
        {event.title}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[15px] text-white/90">
        <span className="flex items-center gap-2">
          <FaRegClock aria-hidden className="size-4 flex-none opacity-80" />
          {formatDateLong(event.start)} · {formatTime(event.start)}
        </span>
        {event.location && (
          <span className="flex items-center gap-2">
            <FaLocationDot aria-hidden className="size-4 flex-none opacity-80" />
            {event.location}
          </span>
        )}
        <span className="rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
          +{formatPointsLabel(event.points)}
        </span>
      </div>

      <div className="mt-7 flex flex-wrap gap-3">
        <AddToCalendarLink
          event={event}
          className="flex items-center gap-2.5 rounded-md bg-white px-6 py-3.5 font-bold text-primary"
        />
        <Link
          href="/events"
          className="flex items-center gap-2.5 rounded-md bg-white/15 px-6 py-3.5 font-semibold text-white"
        >
          All events <FaArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
    </>
  )
}

function Empty() {
  return (
    <>
      <p className={`${EYEBROW} text-white/80`}>Nothing scheduled</p>
      <h1 className="font-display max-w-[18ch] text-[34px] leading-[1.05] font-extrabold tracking-[-1px] sm:text-[44px]">
        No events on the calendar yet.
      </h1>
      <p className="mt-3.5 max-w-[46ch] text-base leading-relaxed text-white/90">
        Officers post events here as they&apos;re scheduled. Check the leaderboard in the
        meantime to see where the chapter stands.
      </p>
      <div className="mt-7">
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-2.5 rounded-md bg-white px-6 py-3.5 font-bold text-primary"
        >
          See the leaderboard <FaArrowRight aria-hidden className="size-3.5" />
        </Link>
      </div>
    </>
  )
}
