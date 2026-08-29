import { getRtcReport, defaultRtcRange } from '@/lib/rtc'
import { toLocalInputValue, fromLocalInputValue, formatDateLong } from '@/lib/format'
import AdminTopbar from '@/app/admin/AdminTopbar'
import ErrorStrip from '@/components/ErrorStrip'
import RtcReportTable from './RtcReportTable'

export const revalidate = 0

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * RTC attendance for the stipend group.
 *
 * Behind the /admin proxy wall like every other console page (proxy.ts matches
 * `/admin/:path*`), so an unauthenticated request never reaches this component.
 *
 * Scoped to a term by default and never to all time — see `defaultRtcRange`.
 * The range in force is printed above the table and editable in the filter, so
 * a number on this page always says what period it covers.
 */
export default async function RtcReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const { from, to } = await searchParams

  const fallback = defaultRtcRange()

  // Both inputs are chapter-local calendar dates. `to` is INCLUSIVE to the
  // officer — "through Dec 31" — and exclusive internally, so a day is added
  // when converting. Without that, every event on the last day of the range
  // would silently drop out of the count.
  const fromAt = parseDay(from) ?? fallback.from
  const toInclusive = parseDay(to)
  const toAt = toInclusive ? new Date(toInclusive.getTime() + DAY_MS) : fallback.to

  // A backwards range would return nothing and look like "nobody attended
  // anything", which is the one wrong answer this page must not give.
  const inverted = toAt.getTime() <= fromAt.getTime()
  const range = inverted
    ? fallback
    : {
        from: fromAt,
        to: toAt,
        // Only the untouched default can honestly wear a term name.
        label:
          fromAt.getTime() === fallback.from.getTime() &&
          toAt.getTime() === fallback.to.getTime()
            ? fallback.label
            : 'Custom range',
      }

  const report = await getRtcReport(range)

  const attendedAtLeastOne = report.rows.filter((r) => r.count > 0).length

  return (
    <>
      <AdminTopbar
        title="RTC attendance"
        subtitle={`${report.range.label} · ${report.rows.length} ${
          report.rows.length === 1 ? 'member' : 'members'
        } in the stipend group · ${report.eventsInRange} RTC ${
          report.eventsInRange === 1 ? 'event' : 'events'
        }`}
      />

      <div className="min-w-0 flex-1 px-5 py-6 md:px-7">
        {/* A plain GET form: the range lives in the URL, so a filtered view is
            shareable and survives a refresh without any client state. */}
        <form
          method="get"
          className="mb-4 flex flex-wrap items-end gap-3 rounded-lg bg-surface px-5 py-4 shadow-card"
        >
          <div>
            <label
              className="mb-1.5 block text-[11px] font-bold tracking-[.05em] text-faint uppercase"
              htmlFor="from"
            >
              From
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={dayValue(range.from)}
              className="rounded-sm border-[1.5px] border-line bg-surface px-3 py-2 text-sm font-semibold outline-none focus:border-primary-bright"
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-[11px] font-bold tracking-[.05em] text-faint uppercase"
              htmlFor="to"
            >
              To (inclusive)
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={dayValue(new Date(range.to.getTime() - DAY_MS))}
              className="rounded-sm border-[1.5px] border-line bg-surface px-3 py-2 text-sm font-semibold outline-none focus:border-primary-bright"
            />
          </div>
          <button
            type="submit"
            className="rounded-sm bg-primary-bright px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
          >
            Apply
          </button>
          <a
            href="/admin/rtc"
            className="rounded-sm border-[1.5px] border-line px-4 py-2 text-sm font-semibold text-muted"
          >
            Reset to {fallback.label}
          </a>

          <p className="w-full text-xs text-faint">
            Counting RTC events from {formatDateLong(range.from.toISOString())} through{' '}
            {formatDateLong(new Date(range.to.getTime() - DAY_MS).toISOString())}.
            {inverted && ' The dates you entered ended before they started, so the term default is shown instead.'}
          </p>
        </form>

        {report.error && (
          <div className="mb-4">
            <ErrorStrip title="This report is incomplete." detail={report.error} />
          </div>
        )}

        <section className="overflow-hidden rounded-lg bg-surface shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
            <div className="min-w-0">
              <h2 className="font-display text-[15px] font-bold">
                Stipend group — RTC events attended
              </h2>
              <p className="mt-0.5 text-xs text-faint">
                Fewest first. {attendedAtLeastOne} of {report.rows.length} have attended
                at least one. Attendance only — points and the leaderboard are not
                involved.
              </p>
            </div>
          </div>

          <RtcReportTable rows={report.rows} rangeLabel={report.range.label} />
        </section>
      </div>
    </>
  )
}

/** "2026-08-01" read as chapter-local midnight, or null if absent/malformed. */
function parseDay(value: string | undefined): Date | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  return fromLocalInputValue(`${value}T00:00`)
}

/** The inverse, for prefilling a `type="date"` input. */
function dayValue(at: Date): string {
  return toLocalInputValue(at.toISOString()).slice(0, 10)
}
