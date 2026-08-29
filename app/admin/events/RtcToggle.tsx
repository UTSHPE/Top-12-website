'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FaCheck } from 'react-icons/fa6'
import { setEventRtc } from '@/app/actions/setEventRtc'

/**
 * Whether this event counts toward RTC, as a control rather than a badge.
 *
 * A badge would have been enough to *show* the status, but the correction this
 * exists for always arrives late — the box was never ticked in September and
 * the tally comes up short in November. The edit form is gated to upcoming
 * events, so this row control is the only way to fix a past one, and
 * `setEventRtc` deliberately has no such gate.
 *
 * Optimistic like CheckInToggle, and reverts on failure for the same reason:
 * the round trip is long enough that a dead-feeling click gets clicked twice.
 */
export default function RtcToggle({
  eventId,
  isRtc,
  title,
}: {
  eventId: string
  isRtc: boolean
  title: string
}) {
  const [optimistic, setOptimistic] = useState(isRtc)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function flip() {
    const next = !optimistic
    setOptimistic(next)
    startTransition(async () => {
      try {
        await setEventRtc(eventId, next)
        router.refresh()
      } catch {
        setOptimistic(!next) // put it back — the change didn't land
      }
    })
  }

  return (
    <button
      onClick={flip}
      disabled={pending}
      role="switch"
      aria-checked={optimistic}
      aria-label={`Counts toward RTC — ${title}`}
      title={
        optimistic
          ? 'Counts toward RTC. Click to stop counting it.'
          : 'Not counted toward RTC. Click to count it — works on past events too.'
      }
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[.04em] uppercase transition-colors disabled:opacity-50 ${
        optimistic
          ? 'bg-secondary/12 text-secondary'
          : 'bg-surface-2 text-[#A99E8F] hover:text-muted'
      }`}
    >
      <span
        aria-hidden
        className={`flex size-3.5 flex-none items-center justify-center rounded-[4px] border transition-colors ${
          optimistic ? 'border-secondary bg-secondary text-white' : 'border-line'
        }`}
      >
        {optimistic && <FaCheck className="size-2" />}
      </span>
      RTC
    </button>
  )
}
