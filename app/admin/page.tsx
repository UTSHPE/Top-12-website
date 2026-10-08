import Link from 'next/link'
import { committeeLabel, getDashboardStats } from '@/lib/events'
import { currentSeason, formatDate, greeting } from '@/lib/format'
import { getOfficer } from '@/lib/officer'
import { LiveDot } from '@/components/StatusPill'
import PresentCodeButton from '@/components/PresentCodeButton'
import ImportantLinks from '@/components/ImportantLinks'
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

      <div className="min-w-0 flex-1 px-4 py-5 sm:px-5 sm:py-6 md:px-7">
        {/* Two across even on a phone — stacked one per row, the four tiles
            took a full screen before any event appeared. */}
        <div className="mb-[22px] grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
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

          <div className="min-w-0 rounded-[14px] bg-secondary p-3.5 text-white shadow-card sm:p-[18px]">
            <div className="mb-1.5 text-xs text-[#C9DBF3]">Live right now</div>
            <div className="font-display text-2xl font-extrabold sm:text-[28px]">
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
              className="-my-2 py-2 text-[13px] font-semibold text-secondary hover:underline"
            >
              View all
            </Link>
          </div>

          {stats.recent.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-muted">
              No events yet — create one and its check-in code appears here.
            </p>
          ) : (
            <>
              {/* Phone: the code and its Present button lead each card —
                  putting a code on the projector from a phone is the main
                  reason an officer opens this screen mid-meeting. */}
              <ul className="md:hidden">
                {stats.recent.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between gap-3 border-t border-black/6 px-4 py-3 first:border-t-0"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2">
                        {event.isOpen && <LiveDot />}
                        <span className="truncate text-sm font-bold">{event.title}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-muted">
                        {formatDate(event.start)} ·{' '}
                        <b className="font-extrabold text-primary">{event.headcount}</b> in
                      </p>
                    </div>
                    <span className="flex flex-none items-center gap-1">
                      <span
                        className={`font-mono text-[15px] font-bold tracking-[.1em] ${
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
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto md:block">
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
                        {committeeLabel(event)}
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
            </>
          )}
        </section>

        <div className="mt-[22px]">
          <ImportantLinks />
        </div>
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
    <div className="min-w-0 rounded-[14px] bg-surface p-3.5 shadow-card sm:p-[18px]">
      <div className="mb-1.5 text-xs text-faint">{label}</div>
      <div
        className={`font-display text-2xl font-extrabold sm:text-[28px] ${accent ? 'text-primary' : ''}`}
      >
        {value}
      </div>
      <div className="mt-[3px] truncate text-xs text-faint">{note}</div>
    </div>
  )
}
