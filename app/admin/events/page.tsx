import Link from 'next/link'
import { FaCar, FaPen, FaUserGroup } from 'react-icons/fa6'
import {
  committeeLabel,
  getAllEventsWithAttendance,
  isUpcoming,
  type EventWithAttendance,
} from '@/lib/events'
import { formatDateLong, formatPoints } from '@/lib/format'
import AdminTopbar, { NewEventButton } from '@/app/admin/AdminTopbar'
import { LiveDot } from '@/components/StatusPill'
import DeleteEventButton from './DeleteEventButton'
import CheckInToggle from './CheckInToggle'
import RtcToggle from './RtcToggle'

export const revalidate = 0

const COLS = 'grid-cols-[2fr_1.1fr_1.2fr_.9fr_1fr_.7fr_1fr_96px_130px_120px]'

export default async function OfficerAnalyticsPage() {
  const events = await getAllEventsWithAttendance()

  const totalHeadcount = events.reduce((sum, e) => sum + e.headcount, 0)
  const totalPoints = events.reduce((sum, e) => sum + e.pointsAwarded, 0)

  return (
    <>
      <AdminTopbar
        title="Events"
        subtitle={`${events.length} ${events.length === 1 ? 'event' : 'events'} · ${totalHeadcount.toLocaleString('en-US')} check-ins · ${totalPoints.toLocaleString('en-US')} points`}
        action={<NewEventButton />}
      />

      <div className="min-w-0 flex-1 px-4 py-5 sm:px-5 sm:py-6 md:px-7">
        <section className="overflow-hidden rounded-lg bg-surface shadow-card">
          <div className="border-b border-hairline px-5 py-4">
            <h2 className="font-display text-[15px] font-bold">
              Attendance &amp; engagement
            </h2>
            <p className="mt-0.5 text-xs text-faint">
              Every event the chapter has run, newest first.
            </p>
          </div>

          {events.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted">
              No events yet — create one to start tracking attendance.
            </p>
          ) : (
            <>
              {/* Phone: one card per event. The table below is 1236px wide —
                  on a phone it showed about a third of a row, and the controls
                  officers reach for mid-event were all off-screen. */}
              <ul className="md:hidden">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </ul>

              <div className="hidden overflow-x-auto md:block">
                <div className="min-w-[1236px]">
                  <div
                    className={`grid ${COLS} bg-surface-2 px-5 py-[11px] text-[11px] font-bold tracking-[.05em] text-faint uppercase`}
                  >
                    <span>Event</span>
                    <span>Type</span>
                    <span>Date</span>
                    <span>Headcount</span>
                    <span>Points given</span>
                    <span>Mult.</span>
                    <span>Code</span>
                    <span>RTC</span>
                    <span>Check-in</span>
                    <span className="text-right">Actions</span>
                  </div>

                  {events.map((event) => (
                    <div
                      key={event.id}
                      className={`grid ${COLS} items-center border-t border-black/6 px-5 py-3.5 text-sm`}
                    >
                      <span className="flex min-w-0 items-center gap-2 pr-3">
                        {event.isOpen && <LiveDot />}
                        <span className="truncate font-bold">{event.title}</span>
                      </span>
                      <span className="truncate pr-3 text-muted">
                        {committeeLabel(event)}
                      </span>
                      <span className="text-muted">{formatDateLong(event.start)}</span>
                      {/* The headcount is the natural handle for "who was
                          there", so it doubles as the link to the raffle list. */}
                      <span className="flex flex-col">
                        <Link
                          href={`/admin/events/${event.id}/sign-ins`}
                          className="font-extrabold text-primary underline-offset-4 hover:underline"
                        >
                          {event.headcount}
                        </Link>
                        {/* Counted apart from the headcount — a driver who
                            stayed is already in the number above. */}
                        {event.driver && (
                          <span className="text-xs text-faint">
                            {event.driverCount} driver{event.driverCount === 1 ? '' : 's'}
                          </span>
                        )}
                      </span>
                      <span className="text-muted">
                        {formatPoints(event.pointsAwarded)} pts
                      </span>
                      <span className="text-muted">{event.multiplier.toFixed(1)}×</span>
                      <span className="flex flex-col">
                        <span
                          className={`font-mono font-bold tracking-[.1em] ${
                            event.isOpen ? 'text-secondary' : 'text-[#A99E8F]'
                          }`}
                        >
                          {event.accessCode}
                        </span>
                        {event.driver && (
                          <span
                            title={`Driver code · ${formatPoints(event.driver.points)} pts`}
                            className="flex items-center gap-1 font-mono text-xs font-bold tracking-[.1em] text-[#A99E8F]"
                          >
                            <FaCar aria-label="Driver code" className="size-3 flex-none" />
                            {event.driver.accessCode}
                          </span>
                        )}
                      </span>
                      {/* Editable on every row, past ones included — see
                          RtcToggle for why this isn't behind the edit form. */}
                      <span>
                        <RtcToggle
                          eventId={event.id}
                          isRtc={event.isRtc}
                          title={event.title}
                        />
                      </span>
                      <span>
                        <CheckInToggle
                          eventId={event.id}
                          enabled={event.checkInEnabled}
                          live={event.isOpen}
                        />
                      </span>
                      <span className="flex justify-end gap-1">
                        <RowActions event={event} />
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  )
}

/**
 * One event on a phone. Same facts and controls as a table row, stacked in the
 * order an officer reaches for them mid-event: is it live, what's the code, how
 * many are in, and the switches.
 */
function EventCard({ event }: { event: EventWithAttendance }) {
  return (
    <li className="border-t border-black/6 px-4 py-4 first:border-t-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            {event.isOpen && <LiveDot />}
            <span className="truncate font-bold">{event.title}</span>
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {committeeLabel(event)} · {formatDateLong(event.start)}
          </p>
        </div>
        <div className="-mt-1.5 -mr-1.5 flex flex-none">
          <RowActions event={event} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-x-5 gap-y-2">
        <span className="flex flex-col">
          <span
            className={`font-mono text-[15px] font-bold tracking-[.1em] ${
              event.isOpen ? 'text-secondary' : 'text-[#A99E8F]'
            }`}
          >
            {event.accessCode}
          </span>
          {event.driver && (
            <span
              title={`Driver code · ${formatPoints(event.driver.points)} pts`}
              className="flex items-center gap-1 font-mono text-xs font-bold tracking-[.1em] text-[#A99E8F]"
            >
              <FaCar aria-label="Driver code" className="size-3 flex-none" />
              {event.driver.accessCode}
            </span>
          )}
        </span>
        <span className="text-sm text-muted">
          <Link
            href={`/admin/events/${event.id}/sign-ins`}
            className="font-extrabold text-primary underline-offset-4 hover:underline"
          >
            {event.headcount}
          </Link>{' '}
          in
          {event.driver && (
            <>
              {' · '}
              {event.driverCount} driver{event.driverCount === 1 ? '' : 's'}
            </>
          )}
        </span>
        <span className="text-sm text-muted">
          {formatPoints(event.pointsAwarded)} pts · {event.multiplier.toFixed(1)}×
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <CheckInToggle eventId={event.id} enabled={event.checkInEnabled} live={event.isOpen} />
        <RtcToggle eventId={event.id} isRtc={event.isRtc} title={event.title} />
      </div>
    </li>
  )
}

/** Raffle list, edit, delete — shared by the table row and the phone card. */
function RowActions({ event }: { event: EventWithAttendance }) {
  return (
    <>
      {/* On every row, past events and empty ones included — unlike the edit
          pencil. An officer opens this the moment an event goes live and
          watches names arrive on refresh, so a zero headcount is exactly when
          it's needed rather than a reason to hide it. */}
      <Link
        href={`/admin/events/${event.id}/sign-ins`}
        aria-label={`Raffle list for ${event.title}`}
        title={`Raffle list for ${event.title}`}
        className="flex size-10 items-center justify-center rounded-sm text-[#A99E8F] transition-colors hover:bg-primary/10 hover:text-primary md:size-8"
      >
        <FaUserGroup aria-hidden className="size-3.5" />
      </Link>
      {isUpcoming(event) && (
        <Link
          href={`/admin/events/${event.id}/edit`}
          aria-label={`Edit ${event.title}`}
          title={`Edit ${event.title}`}
          className="flex size-10 items-center justify-center rounded-sm text-[#A99E8F] transition-colors hover:bg-primary/10 hover:text-primary md:size-8"
        >
          <FaPen aria-hidden className="size-3.5" />
        </Link>
      )}
      <DeleteEventButton eventId={event.id} title={event.title} headcount={event.headcount} />
    </>
  )
}
