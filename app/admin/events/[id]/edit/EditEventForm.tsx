'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FaLock,
  FaLocationDot,
  FaRegClock,
  FaRoad,
  FaTriangleExclamation,
} from 'react-icons/fa6'
import { updateEvent } from '@/app/actions/updateEvent'
import { toLocalInputValue, fromLocalInputValue } from '@/lib/format'
import type { EditableEvent } from '@/lib/events'
import ErrorStrip from '@/components/ErrorStrip'
import { INPUT, LABEL, Panel, DateField, CheckboxField } from '@/components/EventFormFields'

/**
 * Edit the timing and location of an event that hasn't started.
 *
 * Both windows sit in one panel because their relationship is the thing that
 * goes wrong: a check-in window that misses the event is the failure this
 * screen exists to catch, and it's only visible when the two are side by side.
 *
 * Everything else is shown read-only rather than hidden, so an officer can
 * confirm they're editing the right event without being able to change the
 * parts already out in the world — the access code above all.
 */
export default function EditEventForm({ event }: { event: EditableEvent }) {
  // Prefilled as chapter-local wall time so these read identically to the times
  // on the events table, whatever zone the officer's machine is set to.
  const [start, setStart] = useState(() => toLocalInputValue(event.start))
  const [end, setEnd] = useState(() => toLocalInputValue(event.end))
  const [checkInStart, setCheckInStart] = useState(() => toLocalInputValue(event.checkInStart))
  const [checkInEnd, setCheckInEnd] = useState(() => toLocalInputValue(event.checkInEnd))
  const [isOpen, setIsOpen] = useState(event.checkInEnabled)
  const [isRtc, setIsRtc] = useState(event.isRtc)
  const [location, setLocation] = useState(event.location)

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [warning, setWarning] = useState('')
  const router = useRouter()

  const startAt = fromLocalInputValue(start)
  const endAt = fromLocalInputValue(end)
  const checkInStartAt = fromLocalInputValue(checkInStart)
  const checkInEndAt = fromLocalInputValue(checkInEnd)

  // Non-blocking. A check-in window that doesn't reach the event is legal —
  // officers open early and close late on purpose — but one that misses it
  // entirely means members standing at the door with a code that won't work.
  const drift = describeDrift(startAt, endAt, checkInStartAt, checkInEndAt)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')

    if (!startAt || !endAt) {
      setErrorMsg('Enter a valid event start and end time.')
      setSubmitting(false)
      return
    }
    if (!checkInStartAt || !checkInEndAt) {
      setErrorMsg('Enter a valid check-in opening and closing time.')
      setSubmitting(false)
      return
    }
    // Mirrors the server's rules so the officer hears about them immediately.
    // The server re-checks regardless — this is convenience, not enforcement.
    if (endAt.getTime() <= startAt.getTime()) {
      setErrorMsg('The event has to end after it starts.')
      setSubmitting(false)
      return
    }
    if (checkInEndAt.getTime() <= checkInStartAt.getTime()) {
      setErrorMsg('Check-in has to close after it opens.')
      setSubmitting(false)
      return
    }

    try {
      const { calendarWarning } = await updateEvent({
        eventId: event.id,
        calendarStart: startAt.toISOString(),
        calendarEnd: endAt.toISOString(),
        checkInStart: checkInStartAt.toISOString(),
        checkInEnd: checkInEndAt.toISOString(),
        isOpen,
        isRtc,
        location,
      })

      // The row is saved either way. If the calendar didn't follow, hold the
      // officer here so they actually read why, rather than letting the notice
      // vanish behind a redirect.
      if (calendarWarning) {
        setWarning(calendarWarning)
        setSubmitting(false)
        return
      }

      router.push('/admin/events')
      router.refresh()
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to save changes.')
      setSubmitting(false)
    }
  }

  if (warning) {
    return (
      <div className="mx-auto w-full max-w-[820px] px-5 py-6 md:px-7">
        <div className="rounded-xl bg-surface p-6 shadow-card md:p-8">
          <div className="mb-5 flex items-start gap-3">
            <span className="flex size-9 flex-none items-center justify-center rounded-full bg-warning/10">
              <FaTriangleExclamation aria-hidden className="size-4 text-warning" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-[17px] leading-tight font-bold">
                Changes saved
              </h2>
              <p className="mt-1 text-sm text-body">{warning}</p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => {
                router.push('/admin/events')
                router.refresh()
              }}
              autoFocus
              className="rounded-sm bg-primary-bright px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[820px] px-5 py-6 md:px-7">
      <div className="overflow-hidden rounded-xl bg-surface shadow-card">
        <div className="px-6 pt-7 pb-2.5 md:px-[34px]">
          <h1 className="font-display mb-1 text-[26px] font-extrabold tracking-[-.5px]">
            {event.title}
          </h1>
          <p className="text-sm text-faint">
            Only the timing, location, and RTC status can be changed.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-[22px] px-6 pt-3.5 pb-7 md:px-[34px]"
        >
          {/* Shown, never editable. Seeing the code confirms which event this
              is; changing it would strand anyone holding a printed copy. */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[14px] bg-surface-2 px-5 py-4 text-[13px]">
            <span className="flex items-center gap-1.5 font-semibold text-faint">
              <FaLock aria-hidden className="size-3" />
              Fixed
            </span>
            <span className="text-muted">
              Committee <b className="font-bold text-ink">{event.committee}</b>
            </span>
            <span className="text-muted">
              Check-in code{' '}
              <b className="font-mono font-bold tracking-[.1em] text-ink">
                {event.accessCode}
              </b>
            </span>
          </div>

          {/* Next to the committee above, because it is the same kind of
              fact about the event. Unlike everything else on this form it can
              also be corrected after the event has happened — that control is
              the RTC switch on the events table, which has no upcoming gate. */}
          <Panel eyebrow="Road to convention" color="var(--color-secondary)" Icon={FaRoad}>
            <CheckboxField
              id="isRtc"
              label="Counts toward RTC"
              hint="Attendance is counted toward Road to Convention. Points and the leaderboard are unaffected."
              checked={isRtc}
              onChange={setIsRtc}
            />
          </Panel>

          {event.headcount > 0 && (
            <div
              role="status"
              className="flex items-start gap-2.5 rounded-md bg-warning/12 px-4 py-3"
            >
              <FaTriangleExclamation
                aria-hidden
                className="mt-0.5 size-3.5 flex-none text-warning"
              />
              <p className="text-[13px] leading-snug text-body">
                This event has{' '}
                <b>
                  {event.headcount} check-in{event.headcount === 1 ? '' : 's'}
                </b>
                . Changing the time won&apos;t affect them.
              </p>
            </div>
          )}

          <Panel eyebrow="Timing" color="var(--color-secondary)" Icon={FaRegClock}>
            <p className="-mt-1 text-xs text-faint">
              Central time (America/Chicago) — the same zone the events table shows.
            </p>

            <fieldset>
              <legend className="mb-2 text-[11px] font-bold tracking-[.05em] text-faint uppercase">
                When the event runs
              </legend>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <DateField
                  id="calendarStart"
                  label="Event start"
                  value={start}
                  onChange={setStart}
                />
                <DateField id="calendarEnd" label="Event end" value={end} onChange={setEnd} />
              </div>
              <p className="mt-1.5 text-xs text-faint">
                What members see, and what gets mirrored to the Google Calendar.
              </p>
            </fieldset>

            <fieldset className="border-t border-dashed border-line pt-4">
              <legend className="mb-2 text-[11px] font-bold tracking-[.05em] text-faint uppercase">
                When the code works
              </legend>
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
              <p className="mt-1.5 text-xs text-faint">
                Separate from the event times on purpose — opening early or closing late
                is fine. Never sent to the Google Calendar.
              </p>
            </fieldset>

            {/* is_open is ANDed with the window above by lib/checkin.ts, so an
                event can sit inside its window and still refuse every code.
                That state was invisible from this screen until now. */}
            <div className="flex items-start gap-3 rounded-md border-[1.5px] border-line bg-surface px-[15px] py-[13px]">
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                role="switch"
                aria-checked={isOpen}
                aria-label="Check-in enabled"
                className="mt-0.5 flex-none"
              >
                <span
                  aria-hidden
                  className={`relative block h-[22px] w-10 rounded-full transition-colors ${
                    isOpen ? 'bg-success' : 'bg-line'
                  }`}
                >
                  <span
                    className={`absolute top-[3px] size-4 rounded-full bg-white transition-all ${
                      isOpen ? 'left-[21px]' : 'left-[3px]'
                    }`}
                  />
                </span>
              </button>
              <div className="min-w-0">
                <p className="text-[15px] font-semibold">
                  {isOpen ? 'Check-in enabled' : 'Check-in disabled'}
                </p>
                <p className="mt-0.5 text-xs text-faint">
                  {isOpen
                    ? 'Codes work inside the window above.'
                    : 'No code will be accepted, even inside the window above.'}
                </p>
              </div>
            </div>

            {drift && (
              <div
                role="status"
                className="flex items-start gap-2.5 rounded-md bg-warning/12 px-4 py-3"
              >
                <FaTriangleExclamation
                  aria-hidden
                  className="mt-0.5 size-3.5 flex-none text-warning"
                />
                <p className="text-[13px] leading-snug text-body">
                  <b>{drift}</b> You can still save this — check it&apos;s what you meant.
                </p>
              </div>
            )}
          </Panel>

          <Panel eyebrow="Location" color="var(--color-primary)" Icon={FaLocationDot}>
            <div>
              <label className={LABEL} htmlFor="location">
                Location
              </label>
              <input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="ECJ 1.202"
                className={INPUT}
              />
              <p className="mt-1.5 text-xs text-faint">
                Can be left empty. Also updated on the Google Calendar entry.
              </p>
            </div>
          </Panel>

          {errorMsg && <ErrorStrip title="Couldn't save that." detail={errorMsg} />}

          <div className="flex justify-end gap-3">
            <Link
              href="/admin/events"
              className="rounded-md border-[1.5px] border-line bg-surface px-[22px] py-3 text-[15px] font-semibold text-muted"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary-bright px-[26px] py-3 text-[15px] font-bold text-white shadow-[0_8px_18px_rgba(229,114,0,.28)] transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-primary-bright/50"
            >
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/**
 * The one mismatch worth interrupting for: a check-in window that doesn't
 * reach the event at all.
 *
 * Only the disjoint cases. Partial overlap is normal and deliberately silent —
 * warning on "check-in closes before the event ends" would fire on every event
 * that stops taking attendance halfway through, which is most of them.
 */
function describeDrift(
  start: Date | null,
  end: Date | null,
  checkInStart: Date | null,
  checkInEnd: Date | null
): string | null {
  if (!start || !end || !checkInStart || !checkInEnd) return null

  if (checkInEnd.getTime() < start.getTime()) {
    return 'Check-in closes before the event starts.'
  }
  if (checkInStart.getTime() > end.getTime()) {
    return 'Check-in opens after the event has already ended.'
  }
  return null
}
