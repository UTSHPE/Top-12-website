import Link from 'next/link'
import { FaArrowRight } from 'react-icons/fa6'
import { getOpenEvent, getUpcomingEvents } from '@/lib/events'
import { daysUntil } from '@/lib/format'
import MemberNav from '@/components/MemberNav'
import NextEventPanel from '@/components/NextEventPanel'
import EventGroup from '@/components/EventGroup'

export const revalidate = 0

/** How many events the home page lists under the featured one. */
const LISTED = 6

// Home answers one question: what's coming up and when do I need to be there.
// The full filterable archive lives at /events; this page leads with the next
// thing on the calendar and shows enough after it to plan a couple of weeks.
export default async function Home() {
  const [openEvent, upcoming] = await Promise.all([getOpenEvent(), getUpcomingEvents()])

  // An open check-in window outranks the calendar order — if something is
  // happening right now, that is the thing a member came here for.
  const featured = openEvent ?? upcoming[0] ?? null
  const rest = upcoming.filter((event) => event.id !== featured?.id)
  const listed = rest.slice(0, LISTED)

  const thisWeek = listed.filter((event) => daysUntil(event.start) < 7)
  const later = listed.filter((event) => daysUntil(event.start) >= 7)

  return (
    <>
      <MemberNav />

      <main className="mx-auto w-full max-w-[1100px] flex-1 px-5 py-8 sm:px-[30px] sm:py-10">
        <NextEventPanel event={featured} />

        <EventGroup title="This week" events={thisWeek} />
        <EventGroup title="Later on" events={later} />

        {rest.length > listed.length && (
          <Link
            href="/events"
            className="ncta mt-7 inline-flex items-center gap-2 text-sm font-bold text-primary"
          >
            See all {upcoming.length} upcoming events
            <FaArrowRight aria-hidden className="size-3.5" />
          </Link>
        )}
      </main>
    </>
  )
}
