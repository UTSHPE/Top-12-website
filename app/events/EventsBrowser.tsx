'use client'

import { useState } from 'react'
import { FaSliders } from 'react-icons/fa6'
import { FILTERS, matchesCommittee, type ChapterEvent } from '@/lib/events'
import EventCard from '@/components/EventCard'
import EventRow from '@/components/EventRow'

const ALL = 'All'
const CHIPS = [ALL, ...FILTERS] as const

/** "Professional Development" is too long for a chip. */
const chipLabel = (value: string) =>
  value === 'Professional Development' ? 'Professional' : value

export default function EventsBrowser({ events }: { events: ChapterEvent[] }) {
  const [filter, setFilter] = useState<string>(ALL)

  // Matches either committee, so a joint event shows up under both of its hosts.
  const visible =
    filter === ALL ? events : events.filter((e) => matchesCommittee(e, filter))

  return (
    <div className="mx-auto w-full max-w-[1100px] px-5 py-6 sm:px-[30px] sm:py-[30px]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl font-extrabold tracking-[-.6px] sm:text-[32px]">
          Upcoming Events
        </h1>
        <FaSliders aria-hidden className="size-4 text-muted sm:hidden" />
      </div>

      <div
        role="tablist"
        aria-label="Filter events by type"
        className="mb-5 flex flex-wrap gap-2.5"
      >
        {CHIPS.map((chip) => {
          const active = filter === chip
          return (
            <button
              key={chip}
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(chip)}
              className={`rounded-full px-[15px] py-2 text-[13px] transition-colors ${
                active
                  ? 'bg-ink font-semibold text-white'
                  : 'bg-surface font-medium text-body hover:text-primary'
              }`}
            >
              {chipLabel(chip)}
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <p className="rounded-lg bg-surface px-6 py-14 text-center text-sm text-muted shadow-card">
          {events.length === 0
            ? 'No events on the calendar yet — check back soon.'
            : `No ${chipLabel(filter).toLowerCase()} events coming up.`}
        </p>
      ) : (
        <>
          {/* Laptop: tear-off tickets. */}
          <div className="hidden gap-[18px] md:grid md:grid-cols-2 xl:grid-cols-3">
            {visible.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>

          {/* Phone: a clean scrollable list, designed for the size. */}
          <div className="flex flex-col gap-3 md:hidden">
            {visible.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
