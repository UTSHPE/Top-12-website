import type { ChapterEvent } from '@/lib/events'
import EventCard from '@/components/EventCard'
import EventRow from '@/components/EventRow'

/**
 * A titled block of events, using the same two registers as /events: tear-off
 * tickets on laptops, compact rows on phones. Renders nothing when empty so
 * callers can hand it a filtered slice without guarding first.
 */
export default function EventGroup({
  title,
  events,
}: {
  title: string
  events: ChapterEvent[]
}) {
  if (events.length === 0) return null

  return (
    <section className="mt-9">
      <h2 className="font-display mb-4 text-xl font-extrabold tracking-[-.4px]">
        {title}
      </h2>

      <div className="hidden gap-[18px] md:grid md:grid-cols-2 xl:grid-cols-3">
        {events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {events.map((event) => (
          <EventRow key={event.id} event={event} />
        ))}
      </div>
    </section>
  )
}
