'use client'

import { useMemo, useState } from 'react'
import { FaChevronRight, FaCopy, FaFileCsv, FaMagnifyingGlass } from 'react-icons/fa6'
import type { GeneralMeeting, GmAttendee } from '@/lib/gm'
import { formatDateLong } from '@/lib/format'

type Meeting = GeneralMeeting & { label: string }

// Phone: name (with EID and GM marks under it) and the total. From `md` the
// email and phone get their own columns.
const COLS =
  'grid-cols-[minmax(0,1fr)_48px] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1.4fr)_132px_minmax(0,auto)_56px]'

/**
 * Attendees split into one tab per attendance count, rows expanding in place.
 *
 * Like the RTC table, the drill-down is an expanding row and the CSV is built
 * in the browser, so no EID ever lands in a URL or a server log.
 */
export default function GmAttendanceTable({
  meetings,
  attendees,
  termLabel,
}: {
  meetings: Meeting[]
  attendees: GmAttendee[]
  termLabel: string
}) {
  const [tab, setTab] = useState<number | 'all'>('all')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [status, setStatus] = useState('')

  // One tab per possible count, so a new GM adds a tab on its own.
  const tabs = useMemo(() => {
    const counts = Array.from({ length: meetings.length }, (_, i) => i + 1)
    return [
      { key: 'all' as const, label: 'Everyone', size: attendees.length },
      ...counts.map((n) => ({
        key: n,
        label:
          n === meetings.length && n > 1 ? `All ${n}` : `${n} ${n === 1 ? 'GM' : 'GMs'}`,
        size: attendees.filter((a) => a.attended.length === n).length,
      })),
    ]
  }, [meetings.length, attendees])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return attendees
      .filter((a) => tab === 'all' || a.attended.length === tab)
      .filter(
        (a) =>
          !q ||
          [a.name, a.eid, a.email, a.phone, a.major].join(' ').toLowerCase().includes(q)
      )
  }, [attendees, tab, query])

  if (meetings.length === 0) {
    return (
      <div className="px-5 py-12 text-center">
        <p className="text-sm text-muted">No general meetings on the calendar for {termLabel} yet.</p>
        <p className="mt-1.5 text-xs text-faint">
          Create an event with the General Meeting committee and it will show up here.
        </p>
      </div>
    )
  }

  const tabName = tabs.find((t) => t.key === tab)!.label

  async function copy(values: string[], noun: string) {
    const text = values.join(noun === 'emails' ? ', ' : '\n')
    try {
      await navigator.clipboard.writeText(text)
      setStatus(`Copied ${values.length} ${noun} from ${tabName}.`)
    } catch {
      setStatus('Your browser blocked the clipboard. Try Export CSV instead.')
    }
  }

  function downloadCsv() {
    // Quote every field and double embedded quotes; the BOM makes Excel read UTF-8.
    const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
    const csv = [
      [
        'Name',
        'EID',
        'Email',
        'Phone',
        'Major',
        ...meetings.map((m) => `GM #${m.number} ${m.label}`),
        'GMs attended',
      ]
        .map(cell)
        .join(','),
      ...visible.map((a) =>
        [
          a.name,
          a.eid,
          a.email,
          a.phone,
          a.major,
          ...meetings.map((m) => (a.attended.includes(m.number) ? 'Yes' : '')),
          a.attended.length,
        ]
          .map(cell)
          .join(',')
      ),
    ].join('\r\n')

    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gm-attendance-${termLabel}-${tabName}`.toLowerCase().replace(/\s+/g, '-') + '.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="flex flex-col gap-3 border-b border-hairline px-4 py-4 sm:px-5">
        <div role="tablist" aria-label="Filter by GMs attended" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {tabs.map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setTab(t.key)
                  setExpanded(null)
                  setStatus('')
                }}
                className={`flex flex-none items-center gap-2 rounded-full px-[14px] py-2 text-[13px] transition-colors ${
                  active
                    ? 'bg-ink font-semibold text-white'
                    : 'bg-surface-2 font-medium text-body hover:text-primary'
                }`}
              >
                {t.label}
                <span
                  className={`font-display rounded-full px-1.5 text-xs font-bold tabular-nums ${
                    active ? 'bg-primary-bright text-white' : 'bg-line/60 text-ink'
                  }`}
                >
                  {t.size}
                </span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-0 flex-[1_1_220px]">
            <span className="sr-only">Search attendees</span>
            <FaMagnifyingGlass aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-faint" />
            <input
              id="gm-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, EID, email, or major"
              className="w-full rounded-sm border-[1.5px] border-line bg-surface py-2 pr-3 pl-9 text-base outline-none focus:border-primary-bright sm:text-sm"
            />
          </label>
          <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto">
            <ActionButton onClick={() => copy(visible.map((a) => a.email).filter(Boolean), 'emails')}>
              <FaCopy aria-hidden className="size-3.5" /> Emails
            </ActionButton>
            <ActionButton onClick={() => copy(visible.map((a) => a.phone).filter(Boolean), 'phone numbers')}>
              <FaCopy aria-hidden className="size-3.5" /> Phones
            </ActionButton>
            <ActionButton onClick={downloadCsv}>
              <FaFileCsv aria-hidden className="size-3.5" /> CSV
            </ActionButton>
          </div>
        </div>
        {status && (
          <p role="status" className="text-xs font-semibold text-success">
            {status}
          </p>
        )}
      </div>

      <div className={`grid ${COLS} bg-surface-2 px-4 py-[11px] text-[11px] font-bold tracking-[.05em] text-faint uppercase sm:px-5`}>
        <span>Member</span>
        <span className="hidden md:block">Email</span>
        <span className="hidden md:block">Phone</span>
        <span className="hidden md:block">GMs</span>
        <span className="text-right">Total</span>
      </div>

      {visible.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted">
          {query ? 'Nobody in this tab matches that search.' : 'Nobody in this group yet.'}
        </p>
      ) : (
        visible.map((a) => {
          const open = expanded === a.eid
          return (
            <div key={a.eid} className="border-t border-black/6">
              <button
                onClick={() => setExpanded(open ? null : a.eid)}
                aria-expanded={open}
                className={`grid ${COLS} w-full items-center px-4 py-3 text-left text-sm transition-colors hover:bg-surface-2 sm:px-5`}
              >
                <span className="flex min-w-0 items-center gap-2 pr-3">
                  <FaChevronRight
                    aria-hidden
                    className={`size-3 flex-none text-[#A99E8F] transition-transform ${open ? 'rotate-90' : ''}`}
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{a.name}</span>
                    <span className="block truncate font-mono text-xs text-muted">{a.eid}</span>
                    <span className="mt-1.5 block md:hidden">
                      <GmMarks meetings={meetings} attended={a.attended} />
                    </span>
                  </span>
                </span>
                <span className="hidden truncate pr-3 text-[13px] text-body md:block">{a.email || '—'}</span>
                <span className="hidden truncate pr-3 text-[13px] text-muted tabular-nums md:block">{a.phone || '—'}</span>
                <span className="hidden pr-3 md:block">
                  <GmMarks meetings={meetings} attended={a.attended} />
                </span>
                <span className="font-display text-right text-[17px] font-extrabold text-primary">
                  {a.attended.length}
                </span>
              </button>

              {open && (
                <div className="bg-surface-2 px-4 pt-1 pb-4 pl-[36px] sm:px-5 sm:pl-[38px]">
                  <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-1.5 py-2 text-[13px] md:hidden">
                    <dt className="text-faint">Email</dt>
                    <dd className="break-all select-all">{a.email || '—'}</dd>
                    <dt className="text-faint">Phone</dt>
                    <dd className="select-all tabular-nums">{a.phone || '—'}</dd>
                    {a.major && (
                      <>
                        <dt className="text-faint">Major</dt>
                        <dd>{a.major}</dd>
                      </>
                    )}
                  </dl>
                  <ul className="flex flex-col">
                    {meetings
                      .filter((m) => a.attended.includes(m.number))
                      .map((m) => (
                        <li
                          key={m.id}
                          className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-black/5 py-2 text-[13px] last:border-b-0"
                        >
                          <span className="font-semibold">
                            <span className="text-primary">GM #{m.number}</span> · {m.label}
                          </span>
                          <span className="text-muted">{formatDateLong(m.date)}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })
      )}
    </>
  )
}

/** One small numbered square per GM, filled where the member attended. */
function GmMarks({ meetings, attended }: { meetings: Meeting[]; attended: number[] }) {
  return (
    <span className="flex flex-wrap gap-1">
      {meetings.map((m) => {
        const went = attended.includes(m.number)
        return (
          <span
            key={m.id}
            title={`GM #${m.number} ${m.label}${went ? '' : ' — missed'}`}
            className={`flex size-[22px] items-center justify-center rounded-[6px] text-[11px] font-bold tabular-nums ${
              went ? 'bg-success-bg text-success' : 'border border-line text-[#C9C0B4]'
            }`}
          >
            {m.number}
          </span>
        )
      })}
    </span>
  )
}

function ActionButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 rounded-sm border-[1.5px] border-line px-3.5 py-2 text-sm font-semibold text-muted transition-colors hover:border-primary hover:text-primary"
    >
      {children}
    </button>
  )
}
