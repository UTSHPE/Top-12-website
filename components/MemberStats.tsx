'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FaCarSide, FaCircleInfo } from 'react-icons/fa6'
import { formatDay, formatMonth, formatPoints } from '@/lib/format'
import type { AttendedEvent, MemberStats as Stats } from '@/lib/memberStats'

/**
 * The member stats lookup: an EID box, then that member's totals and the
 * events they checked in to.
 *
 * Posts to /api/stats rather than putting the EID in the URL, so it never ends
 * up in browser history or access logs. A returning member arrives with
 * `initialStats` already rendered from their check-in cookie.
 */
export default function MemberStats({ initialStats }: { initialStats: Stats | null }) {
  const [stats, setStats] = useState<Stats | null>(initialStats)
  const [eid, setEid] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!eid.trim() || pending) return

    setPending(true)
    setError('')
    try {
      const res = await fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eid }),
      })
      const data = await res.json()
      if (data.ok) {
        setStats(data.stats as Stats)
      } else {
        setError(data.message ?? 'Something went wrong. Try again.')
      }
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  if (stats) {
    return (
      <StatsView
        stats={stats}
        onReset={() => {
          setStats(null)
          setEid('')
        }}
      />
    )
  }

  return (
    <form onSubmit={submit} className="rounded-lg bg-surface p-6 shadow-card sm:p-7">
      <div className="mb-5">
        <label
          htmlFor="eid"
          className="mb-1.5 block text-[11px] font-bold tracking-[.05em] text-faint uppercase"
        >
          UT EID
        </label>
        <input
          id="eid"
          name="eid"
          value={eid}
          onChange={(e) => {
            setEid(e.target.value)
            setError('')
          }}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="e.g. abc1234"
          className="w-full rounded-sm border border-line bg-surface-2 px-3.5 py-3 text-base lowercase sm:text-[15px] placeholder:normal-case placeholder:text-faint/70 focus:border-primary focus:outline-none"
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-md border-l-4 border-error bg-surface-2 px-4 py-3"
        >
          <FaCircleInfo aria-hidden className="mt-0.5 size-4 flex-none text-error" />
          <p className="text-sm text-body">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!eid.trim() || pending}
        className="w-full rounded-sm bg-primary-bright py-3.5 text-[15px] font-bold text-white shadow-cta transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-primary-bright/40 disabled:shadow-none"
      >
        {pending ? 'Looking up…' : 'Show my stats'}
      </button>
    </form>
  )
}

function StatsView({ stats, onReset }: { stats: Stats; onReset: () => void }) {
  const subtitle = [stats.major, stats.classYear].filter(Boolean).join(' · ')

  return (
    <div>
      <div className="mb-4 rounded-lg bg-surface p-5 shadow-card sm:p-6">
        <h2 className="font-display text-xl font-extrabold tracking-[-.3px]">{stats.name}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-faint">{subtitle}</p>}

        <dl className="mt-4 grid grid-cols-3 gap-2.5">
          <Tile label="Points" value={formatPoints(stats.points)} accent />
          <Tile label="Rank" value={stats.rank ? `#${stats.rank}` : '—'} />
          <Tile label="Events" value={String(stats.events.length)} />
        </dl>

        <div className="mt-4 flex items-center justify-between gap-3 text-sm">
          <Link href="/leaderboard" className="font-bold text-primary">
            View leaderboard
          </Link>
          <button type="button" onClick={onReset} className="font-semibold text-muted hover:text-ink">
            Look up a different EID
          </button>
        </div>
      </div>

      <h3 className="mb-2 px-1 text-[11px] font-bold tracking-[.05em] text-faint uppercase">
        Events attended
      </h3>

      {stats.events.length === 0 ? (
        <p className="rounded-lg bg-surface px-5 py-6 text-center text-sm text-body shadow-card">
          No check-ins yet — your events will show up here.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {stats.events.map((event) => (
            <AttendedRow key={event.id} event={event} />
          ))}
        </ul>
      )}
    </div>
  )
}

function Tile({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-md bg-surface-2 px-3 py-3 text-center">
      <dt className="text-[10px] font-bold tracking-[.05em] text-faint uppercase">{label}</dt>
      <dd
        className={`font-display mt-0.5 text-2xl leading-tight font-extrabold ${
          accent ? 'text-primary' : ''
        }`}
      >
        {value}
      </dd>
    </div>
  )
}

function AttendedRow({ event }: { event: AttendedEvent }) {
  return (
    <li className="flex items-center gap-3 rounded-[15px] bg-surface p-[13px] shadow-card">
      <div
        className="flex-none rounded-[11px] px-[11px] py-2 text-center"
        style={{ background: event.disc }}
      >
        <div className="text-[9px] font-bold uppercase" style={{ color: event.accent }}>
          {formatMonth(event.start)}
        </div>
        <div className="font-display text-xl leading-none font-extrabold">
          {formatDay(event.start)}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase" style={{ color: event.accent }}>
          {event.committee}
        </div>
        <p className="font-display truncate text-[15px] font-bold">{event.title}</p>
        {event.driver && (
          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold text-secondary">
            <FaCarSide aria-hidden className="size-3" />
            Drove
          </span>
        )}
      </div>

      <div className="flex-none text-[13px] font-extrabold text-success">
        +{formatPoints(event.points)}
      </div>
    </li>
  )
}
