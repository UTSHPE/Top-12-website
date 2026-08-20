'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FaLock, FaRegClock, FaTriangleExclamation } from 'react-icons/fa6'
import { updateEvent } from '@/app/actions/updateEvent'
import { toLocalInputValue, fromLocalInputValue } from '@/lib/format'
import type { EditableEvent } from '@/lib/events'
import ErrorStrip from '@/components/ErrorStrip'
import { INPUT, LABEL, Panel, DateField } from '@/components/EventFormFields'

/**
 * Edit the date, time, and location of an event that hasn't started.
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
  const [location, setLocation] = useState(event.location)

  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [warning, setWarning] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setErrorMsg('')

    const startAt = fromLocalInputValue(start)
    const endAt = fromLocalInputValue(end)

    if (!startAt || !endAt) {
      setErrorMsg('Enter a valid start and end time.')
      setSubmitting(false)
      return
    }
    // Mirrors the server's rule so the officer hears about it immediately. The
    // server re-checks regardless — this is convenience, not enforcement.
    if (endAt.getTime() <= startAt.getTime()) {
      setErrorMsg('The event has to end after it starts.')
      setSubmitting(false)
      return
    }

    try {
      const { calendarWarning } = await updateEvent({
        eventId: event.id,
        calendarStart: startAt.toISOString(),
        calendarEnd: endAt.toISOString(),
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
            Only the date, time, and location can be changed.
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
            <div className="grid gap-3.5 sm:grid-cols-2">
              <DateField
                id="calendarStart"
                label="Event start"
                value={start}
                onChange={setStart}
              />
              <DateField id="calendarEnd" label="Event end" value={end} onChange={setEnd} />
            </div>
            <p className="text-xs text-faint">
              Central time (America/Chicago) — the same zone the events table shows.
            </p>

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
