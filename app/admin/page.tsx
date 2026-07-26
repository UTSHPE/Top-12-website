import Link from 'next/link'
import { categoryStyle, getDashboardStats } from '@/lib/events'
import { currentSeason, formatDate, greeting } from '@/lib/format'
import { getOfficer } from '@/lib/officer'
import { LiveDot } from '@/components/StatusPill'
import PresentCodeButton from '@/components/PresentCodeButton'
import AdminTopbar, { NewEventButton } from './AdminTopbar'

export const revalidate = 0

const TABLE_COLS = 'grid-cols-[2.2fr_1.2fr_1fr_.9fr_1.4fr]'

export default async function OfficerDashboardPage() {
  const [stats, officer] = await Promise.all([getDashboardStats(), getOfficer()])

  return (
    <>
      <AdminTopbar
        title={officer ? `${greeting()}, ${officer.firstName}` : greeting()}
        subtitle={`${currentSeason()} · ${stats.eventsRun} ${
          stats.eventsRun === 1 ? 'event' : 'events'
        } run`}
        action={<NewEventButton />}
      />

      <div className="min-w-0 flex-1 px-5 py-6 md:px-7">
        <div className="mb-[22px] grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Total check-ins"
            value={stats.totalCheckIns.toLocaleString('en-US')}
            note="all time"
          />
          <StatTile
            label="Points given"
            value={stats.pointsGiven.toLocaleString('en-US')}
            note={`across ${stats.eventsRun} ${stats.eventsRun === 1 ? 'event' : 'events'}`}
            accent
          />
          <StatTile
            label="Avg. attendance"
            value={stats.avgGeneralMeetingAttendance.toLocaleString('en-US')}
            note="per general meeting"
          />

          <div className="rounded-[14px] bg-secondary p-[18px] text-white shadow-card">
            <div className="mb-1.5 text-xs text-[#C9DBF3]">Live right now</div>
            <div className="font-display text-[28px] font-extrabold">
              {stats.liveNow ? stats.liveNow.headcount.toLocaleString('en-US') : '—'}
            </div>
            <div className="mt-[3px] flex items-center gap-1.5 truncate text-xs text-[#C9DBF3]">
              {stats.liveNow ? (
                <>
                  <LiveDot className="size-1.5 bg-[#8FE3C9]" />
                  {stats.liveNow.title}
                </>
              ) : (
                'No event open for check-in'
              )}
            </div>
          </div>
        </div>

        <section className="overflow-hidden rounded-lg bg-surface shadow-card">
          <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4">
            <h2 className="font-display text-[15px] font-bold">Recent events</h2>
            <Link
              href="/admin/events"
              className="text-[13px] font-semibold text-secondary hover:underline"
            >
              View all
            </Link>
          </div>

          {stats.recent.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted">
              No events yet — create one and its check-in code appears here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[680px]">
                <div
                  className={`grid ${TABLE_COLS} bg-surface-2 px-5 py-[11px] text-[11px] font-bold tracking-[.05em] text-faint uppercase`}
                >
                  <span>Event</span>
                  <span>Type</span>
                  <span>Date</span>
                  <span>Headcount</span>
                  <span>Code</span>
                </div>

                {stats.recent.map((event) => (
                  <div
                    key={event.id}
                    className={`grid ${TABLE_COLS} items-center border-t border-black/6 px-5 py-3.5 text-sm`}
                  >
                    <span className="truncate pr-3 font-bold">{event.title}</span>
                    <span className="truncate pr-3 text-muted">
                      {categoryStyle(event.eventType).label}
                    </span>
                    <span className="text-muted">{formatDate(event.start)}</span>
                    <span className="font-extrabold text-primary">{event.headcount}</span>
                    {/* The live event's code is the one an officer needs to read
                        out; past codes stay legible but recede. */}
                    <span className="flex items-center gap-2">
                      <span
                        className={`font-mono font-bold tracking-[.1em] ${
                          event.isOpen ? 'text-secondary' : 'text-[#A99E8F]'
                        }`}
                      >
                        {event.accessCode}
                      </span>
                      <PresentCodeButton
                        code={event.accessCode}
                        eventTitle={event.title}
                        variant="icon"
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

function StatTile({
  label,
  value,
  note,
  accent = false,
}: {
  label: string
  value: string
  note: string
  accent?: boolean
}) {
  return (
    <div className="rounded-[14px] bg-surface p-[18px] shadow-card">
      <div className="mb-1.5 text-xs text-faint">{label}</div>
      <div
        className={`font-display text-[28px] font-extrabold ${accent ? 'text-primary' : ''}`}
      >
        {value}
      </div>
      <div className="mt-[3px] text-xs text-faint">{note}</div>
    </div>
  )
}
