'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  FaCheck,
  FaRegCircleDot,
  FaRegClock,
  FaRegCopy,
  FaStar,
  FaTriangleExclamation,
} from 'react-icons/fa6'
import { createEvent } from '@/app/actions/createEvent'
import { EVENT_TYPES } from '@/lib/events'
import CodeDisplay from '@/components/CodeDisplay'
import PresentCodeButton from '@/components/PresentCodeButton'
import ErrorStrip from '@/components/ErrorStrip'

const INPUT =
  'w-full rounded-[10px] border-[1.5px] border-line bg-surface px-[13px] py-[11px] text-[15px] font-semibold outline-none transition-colors focus:border-primary-bright'
const LABEL = 'mb-1.5 block text-[13px] font-semibold text-muted'

export default function CreateEventForm({ officerName }: { officerName: string }) {
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [eventType, setEventType] = useState('')
  const [createdByOfficer, setCreatedByOfficer] = useState(officerName)
  const [calendarStart, setCalendarStart] = useState('')
  const [calendarEnd, setCalendarEnd] = useState('')
  const [checkInStart, setCheckInStart] = useState('')
  const [checkInEnd, setCheckInEnd] = useState('')
  const [basePoints, setBasePoints] = useState(1)
  const [multiplier, setMultiplier] = useState(1.0)
  const [isRecurring, setIsRecurring] = useState(false)
  const [weekCount, setWeekCount] = useState(2)

  const [submitting, setSubmitting] = useState(false)
  const [codes, setCodes] = useState<string[] | null>(null)
  const [calendarWarnings, setCalendarWarnings] = useState<string[]>([])
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')

    try {
      const { codes, calendarWarnings } = await createEvent({
        title,
        location,
        eventType,
        createdByOfficer,
        calendarStart: new Date(calendarStart),
        calendarEnd: new Date(calendarEnd),
        checkInStart: new Date(checkInStart),
        checkInEnd: new Date(checkInEnd),
        basePoints,
        multiplier,
        isRecurring,
        weekCount: isRecurring ? weekCount : 1,
      })
      setCalendarWarnings(calendarWarnings)
      setCodes(codes)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create event.')
    } finally {
      setSubmitting(false)
    }
  }

  if (codes)
    return (
      <CodeGenerated
        codes={codes}
        eventTitle={title}
        calendarWarnings={calendarWarnings}
      />
    )

  return (
    <div className="mx-auto w-full max-w-[820px] px-5 py-6 md:px-7">
      <div className="overflow-hidden rounded-xl bg-surface shadow-card">
        <div className="px-6 pt-7 pb-2.5 md:px-[34px]">
          <h1 className="font-display mb-1 text-[26px] font-extrabold tracking-[-.5px]">
            Create event
          </h1>
          <p className="text-sm text-faint">
            A six-character check-in code is generated when you save.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-[22px] px-6 pt-3.5 pb-7 md:px-[34px]"
        >
          <Panel eyebrow="Event details" color="var(--color-primary)" Icon={FaRegCircleDot}>
            <div>
              <label className={LABEL} htmlFor="title">
                Title
              </label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder="Careers in Semiconductors"
                className={INPUT}
              />
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor="location">
                  Location
                </label>
                <input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  placeholder="ECJ 1.202"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="eventType">
                  Type
                </label>
                <select
                  id="eventType"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  required
                  className={INPUT}
                >
                  <option value="" disabled>
                    Select type
                  </option>
                  {EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className={LABEL} htmlFor="host">
                Hosting officer
              </label>
              <input
                id="host"
                value={createdByOfficer}
                onChange={(e) => setCreatedByOfficer(e.target.value)}
                required
                placeholder="Officer's full name"
                className={INPUT}
              />
            </div>
          </Panel>

          <Panel eyebrow="Timing" color="var(--color-secondary)" Icon={FaRegClock}>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <DateField
                id="calendarStart"
                label="Event start"
                value={calendarStart}
                onChange={setCalendarStart}
              />
              <DateField
                id="calendarEnd"
                label="Event end"
                value={calendarEnd}
                onChange={setCalendarEnd}
              />
            </div>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <DateField
                id="checkInStart"
                label="Check-in opens"
                value={checkInStart}
                onChange={setCheckInStart}
              />
              <DateField
                id="checkInEnd"
                label="Check-in closes"
                value={checkInEnd}
                onChange={setCheckInEnd}
              />
            </div>
          </Panel>

          <Panel eyebrow="Points & recurrence" color="var(--color-success)" Icon={FaStar}>
            <div className="grid gap-3.5 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor="basePoints">
                  Base points
                </label>
                <input
                  id="basePoints"
                  type="number"
                  min={1}
                  value={basePoints}
                  onChange={(e) => setBasePoints(Number(e.target.value))}
                  required
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="multiplier">
                  Multiplier
                </label>
                <input
                  id="multiplier"
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={multiplier}
                  onChange={(e) => setMultiplier(Number(e.target.value))}
                  required
                  className={INPUT}
                />
              </div>
            </div>

            {/* Checkbox and week count are bound into one bordered group so the
                dropdown reads as a condition of the checkbox, not a new field. */}
            <div className="overflow-hidden rounded-md border-[1.5px] border-line">
              <label className="flex cursor-pointer items-center gap-[11px] bg-surface px-[15px] py-[13px]">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={`flex size-[22px] flex-none items-center justify-center rounded-[6px] border-[1.5px] transition-colors ${
                    isRecurring
                      ? 'border-primary-bright bg-primary-bright text-white'
                      : 'border-line bg-surface'
                  }`}
                >
                  {isRecurring && <FaCheck className="size-3" />}
                </span>
                <span className="text-[15px] font-semibold">Repeat weekly</span>
              </label>

              {isRecurring && (
                <div className="flex flex-wrap items-center gap-3 border-t border-dashed border-line bg-[#FBFAF8] px-[15px] pt-[13px] pb-[15px]">
                  <span className="text-[13px] text-muted">for</span>
                  <select
                    aria-label="Number of weeks"
                    value={weekCount}
                    onChange={(e) => setWeekCount(Number(e.target.value))}
                    className="rounded-sm border-[1.5px] border-line bg-surface px-3 py-2 text-sm font-semibold outline-none focus:border-primary-bright"
                  >
                    {Array.from({ length: 15 }, (_, i) => i + 2).map((n) => (
                      <option key={n} value={n}>
                        {n} weeks
                      </option>
                    ))}
                  </select>
                  <span className="text-[13px] text-faint">
                    — creates {weekCount} events, one code each
                  </span>
                </div>
              )}
            </div>
          </Panel>

          {errorMsg && <ErrorStrip title="Couldn't create that." detail={errorMsg} />}

          <div className="flex justify-end gap-3">
            <Link
              href="/admin"
              className="rounded-md border-[1.5px] border-line bg-surface px-[22px] py-3 text-[15px] font-semibold text-muted"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary-bright px-[26px] py-3 text-[15px] font-bold text-white shadow-[0_8px_18px_rgba(229,114,0,.28)] transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-primary-bright/50"
            >
              {submitting
                ? 'Creating…'
                : isRecurring
                  ? `Create ${weekCount} events`
                  : 'Create event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Panel({
  eyebrow,
  color,
  Icon,
  children,
}: {
  eyebrow: string
  color: string
  Icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[14px] bg-surface-2 p-5">
      <h2
        className="font-display mb-4 flex items-center gap-1.5 text-[13px] font-bold tracking-[.06em] uppercase"
        style={{ color }}
      >
        <Icon className="size-3.5" />
        {eyebrow}
      </h2>
      <div className="flex flex-col gap-3.5">{children}</div>
    </section>
  )
}

function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div>
      <label className={LABEL} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className={`${INPUT} text-sm`}
      />
    </div>
  )
}

/**
 * The officer-side signature moment: the code exists now, and the only thing
 * that matters is getting it in front of the room.
 */
function CodeGenerated({
  codes,
  eventTitle,
  calendarWarnings,
}: {
  codes: string[]
  eventTitle: string
  calendarWarnings: string[]
}) {
  const [copied, setCopied] = useState(false)
  const code = codes[0]

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked (insecure origin, permissions) — the code is
      // on screen either way, so this is not worth an error state.
    }
  }

  return (
    <>
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-[520px] rounded-xl bg-ink p-8 text-center text-white shadow-shell sm:p-9">
          <div className="mx-auto mb-[18px] flex size-14 animate-popcheck items-center justify-center rounded-full bg-success">
            <FaCheck aria-hidden className="size-[26px]" />
          </div>
          <h1 className="font-display mb-1.5 text-2xl font-extrabold tracking-[-.4px]">
            Event created
          </h1>
          <p className="mb-[26px] text-[15px] text-[#C7BCAE]">
            Put this code on your slide — members type it to check in.
          </p>

          <div className="mb-[22px]">
            <CodeDisplay code={code} size="lg" tone="dark" />
          </div>

          {codes.length > 1 && (
            <p className="mb-5 text-[13px] text-[#A99E8F]">
              {codes.length} events created — each week has its own code, listed on the
              dashboard.
            </p>
          )}

          {/* The rows are saved either way, so this is a partial success, not a
              failure — but it must never be silent. */}
          {calendarWarnings.length > 0 && (
            <div className="mb-5 flex items-start gap-2.5 rounded-md bg-warning/15 px-4 py-3 text-left">
              <FaTriangleExclamation
                aria-hidden
                className="mt-0.5 size-3.5 flex-none text-warning-soft"
              />
              <p className="text-[13px] leading-snug text-warning-soft">
                {calendarWarnings.length === codes.length && codes.length === 1
                  ? "It wasn't added to the Google Calendar"
                  : `${calendarWarnings.length} of these weren't added to the Google Calendar`}{' '}
                — {calendarWarnings[0]} The check-in code still works.
              </p>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-2.5">
            <button
              onClick={copy}
              className="flex items-center gap-2 rounded-sm bg-white/12 px-5 py-2.5 text-sm font-semibold text-white"
            >
              <FaRegCopy aria-hidden className="size-3.5" />
              {copied ? 'Copied' : 'Copy code'}
            </button>
            <PresentCodeButton code={code} eventTitle={eventTitle} />
          </div>

          <Link
            href="/admin/create-event"
            className="mt-6 inline-block text-[13px] font-semibold text-[#A99E8F] hover:text-white"
          >
            Create another event
          </Link>
        </div>
      </div>
    </>
  )
}
