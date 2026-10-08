import type { ChapterEvent } from '@/lib/events'
import EventCard from '@/components/EventCard'
import EventRow from '@/components/EventRow'

export default function EventsBrowser({ events }: { events: ChapterEvent[] }) {
  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 sm:px-[30px] sm:py-[30px]">
      <h1 className="font-display mb-5 text-2xl font-extrabold tracking-[-.6px] sm:text-[32px]">
        Upcoming Events
      </h1>

      {events.length === 0 ? (
        <p className="rounded-lg bg-surface px-6 py-14 text-center text-sm text-muted shadow-card">
          No events on the calendar yet — check back soon.
        </p>
      ) : (
        <>
          {/* Laptop: tear-off tickets. */}
          <div className="hidden gap-[18px] md:grid md:grid-cols-2 xl:grid-cols-3">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {/* Phone: a clean scrollable list, designed for the size. */}
          <div className="flex flex-col gap-3 md:hidden">
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
