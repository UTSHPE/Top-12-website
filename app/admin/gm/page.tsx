import { getGmReport } from '@/lib/gm'
import { formatDate } from '@/lib/format'
import AdminTopbar from '@/app/admin/AdminTopbar'
import ErrorStrip from '@/components/ErrorStrip'
import GmAttendanceTable from './GmAttendanceTable'

// Rendered per request, so a new GM or a fresh check-in shows on the next load.
export const revalidate = 0

/**
 * General meeting attendance for the current term, split by how many GMs each
 * member came to. Behind the /admin proxy wall like every console page.
 */
export default async function GmAttendancePage() {
  const report = await getGmReport()
  const { meetings, attendees } = report

  return (
    <>
      <AdminTopbar
        title="GM attendance"
        subtitle={`${report.termLabel} · ${meetings.length} general ${
          meetings.length === 1 ? 'meeting' : 'meetings'
        } · ${attendees.length} ${attendees.length === 1 ? 'member' : 'members'} attended`}
      />

      <div className="min-w-0 flex-1 px-4 py-5 sm:px-5 sm:py-6 md:px-7">
        {report.error && (
          <div className="mb-4">
            <ErrorStrip title="This list is incomplete." detail={report.error} />
          </div>
        )}

        {meetings.length > 0 && (
          <ul className="mb-4 grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
            {meetings.map((m) => {
              const count = attendees.filter((a) => a.attended.includes(m.number)).length
              return (
                <li key={m.id} className="min-w-0 rounded-md bg-surface px-3.5 py-3 shadow-card">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-sm font-extrabold text-primary">
                      GM #{m.number}
                    </span>
                    <span className="text-[11px] text-faint">{formatDate(m.date)}</span>
                  </div>
                  <div className="mt-0.5 truncate text-[13px] font-semibold" title={m.title}>
                    {companyOf(m.title)}
                  </div>
                  <div className="mt-1 text-xs text-muted">
                    <b className="font-display text-ink">{count}</b> attended
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <section className="overflow-hidden rounded-lg bg-surface shadow-card">
          <GmAttendanceTable
            meetings={meetings.map((m) => ({ ...m, label: companyOf(m.title) }))}
            attendees={attendees}
            termLabel={report.termLabel}
          />
        </section>
      </div>
    </>
  )
}

/** "General Meeting #3 - Arm" → "Arm"; a title without a dash stays whole. */
function companyOf(title: string): string {
  const parts = title.split(/\s+[-–—]\s+/)
  return parts.length > 1 ? parts.slice(1).join(' - ') : title
}
