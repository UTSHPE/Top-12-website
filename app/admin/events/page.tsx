import { categoryStyle, getAllEventsWithAttendance } from '@/lib/events'
import { formatDateLong, formatPoints } from '@/lib/format'
import AdminTopbar, { NewEventButton } from '@/app/admin/AdminTopbar'
import { LiveDot } from '@/components/StatusPill'
import DeleteEventButton from './DeleteEventButton'

export const revalidate = 0

const COLS = 'grid-cols-[2fr_1.1fr_1.2fr_.9fr_1fr_.7fr_1fr_120px]'

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

      <div className="min-w-0 flex-1 px-5 py-6 md:px-7">
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
            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
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
                      {categoryStyle(event.eventType).label}
                    </span>
                    <span className="text-muted">{formatDateLong(event.start)}</span>
                    <span className="font-extrabold text-primary">{event.headcount}</span>
                    <span className="text-muted">
                      {formatPoints(event.pointsAwarded)} pts
                    </span>
                    <span className="text-muted">{event.multiplier.toFixed(1)}×</span>
                    <span
                      className={`font-mono font-bold tracking-[.1em] ${
                        event.isOpen ? 'text-secondary' : 'text-[#A99E8F]'
                      }`}
                    >
                      {event.accessCode}
                    </span>
                    <span className="flex justify-end">
                      <DeleteEventButton
                        eventId={event.id}
                        title={event.title}
                        headcount={event.headcount}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
