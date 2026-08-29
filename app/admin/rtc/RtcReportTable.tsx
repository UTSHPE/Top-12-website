'use client'

import { useState } from 'react'
import { FaChevronRight, FaFileCsv } from 'react-icons/fa6'
import type { RtcMemberRow } from '@/lib/rtc'
import { formatDateLong } from '@/lib/format'

const COLS = 'grid-cols-[1.6fr_1fr_150px]'

/**
 * The report table, with each member's events expanding in place.
 *
 * The drill-down is an expanding row rather than a `/admin/rtc/[eid]` route on
 * purpose: an EID is a student identifier, and putting one in a path writes it
 * into every access log, proxy log, and Referer header between here and the
 * browser. Expanding in place keeps them out of all of that — the rows are
 * already loaded, so there is nothing to fetch either.
 *
 * The CSV is likewise built and downloaded in the browser from data that is
 * already on the page. No request, so no EID in a URL and no server log entry.
 */
export default function RtcReportTable({
  rows,
  rangeLabel,
}: {
  rows: RtcMemberRow[]
  rangeLabel: string
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (rows.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-sm text-muted">Nobody is marked as stipend-eligible yet.</p>
        <p className="mt-1.5 text-xs text-faint">
          Set <code className="font-mono">members.stipend_eligible</code> to true for the
          members on the list, and they&apos;ll appear here.
        </p>
      </div>
    )
  }

  function downloadCsv() {
    // Quote every field and double any embedded quote — a member's name can
    // legitimately contain a comma, and an unquoted one would shift the count
    // into the wrong column for that row.
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [
      ['Name', 'EID', 'RTC events attended'].map(cell).join(','),
      ...rows.map((r) => [cell(r.name), cell(r.eid), cell(r.count)].join(',')),
    ].join('\r\n')

    // The BOM is what makes Excel read this as UTF-8 — without it, accented
    // names in the roster arrive mangled.
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rtc-attendance-${rangeLabel.toLowerCase().replace(/\s+/g, '-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="flex justify-end border-b border-hairline px-5 py-3">
        <button
          onClick={downloadCsv}
          className="flex items-center gap-2 rounded-sm border-[1.5px] border-line px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
        >
          <FaFileCsv aria-hidden className="size-3.5" />
          Export CSV
        </button>
      </div>

      <div className={`grid ${COLS} bg-surface-2 px-5 py-[11px] text-[11px] font-bold tracking-[.05em] text-faint uppercase`}>
        <span>Member</span>
        <span>EID</span>
        <span className="text-right">RTC events attended</span>
      </div>

      {rows.map((row) => {
        const open = expanded === row.eid
        return (
          <div key={row.eid} className="border-t border-black/6">
            <button
              onClick={() => setExpanded(open ? null : row.eid)}
              aria-expanded={open}
              className={`grid ${COLS} w-full items-center px-5 py-3.5 text-left text-sm transition-colors hover:bg-surface-2`}
            >
              <span className="flex min-w-0 items-center gap-2 pr-3">
                <FaChevronRight
                  aria-hidden
                  className={`size-3 flex-none text-[#A99E8F] transition-transform ${
                    open ? 'rotate-90' : ''
                  }`}
                />
                <span className="truncate font-bold">{row.name}</span>
              </span>
              <span className="truncate pr-3 font-mono text-[13px] text-muted">
                {row.eid}
              </span>
              <span
                className={`text-right text-[15px] font-extrabold ${
                  row.count === 0 ? 'text-[#A99E8F]' : 'text-primary'
                }`}
              >
                {row.count}
              </span>
            </button>

            {open && (
              <div className="bg-surface-2 px-5 pt-1 pb-4 pl-[38px]">
                {row.events.length === 0 ? (
                  <p className="py-2 text-[13px] text-faint">
                    No RTC events attended in this range.
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {row.events.map((event) => (
                      <li
                        key={event.id}
                        className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-black/5 py-2 text-[13px] last:border-b-0"
                      >
                        <span className="font-semibold">{event.title}</span>
                        <span className="text-muted">{formatDateLong(event.date)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
