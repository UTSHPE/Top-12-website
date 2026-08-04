'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setCheckInOpen } from '@/app/actions/setCheckInOpen'

/**
 * The officer's manual check-in switch for one event.
 *
 * `enabled` is the stored flag; `live` is whether a code would actually work
 * right now. They differ when the event is enabled but outside its window,
 * which is the common case for every past and future event in the table — so
 * the control says "Scheduled" rather than implying check-in is running.
 */
export default function CheckInToggle({
  eventId,
  enabled,
  live,
}: {
  eventId: string
  enabled: boolean
  live: boolean
}) {
  const [optimistic, setOptimistic] = useState(enabled)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function flip() {
    const next = !optimistic
    setOptimistic(next)
    startTransition(async () => {
      try {
        await setCheckInOpen(eventId, next)
        router.refresh()
      } catch {
        setOptimistic(!next) // put it back — the change didn't land
      }
    })
  }

  const label = !optimistic ? 'Closed' : live ? 'Open now' : 'Scheduled'

  return (
    <button
      onClick={flip}
      disabled={pending}
      role="switch"
      aria-checked={optimistic}
      title={
        optimistic
          ? 'Close check-in for this event now'
          : 'Re-open check-in (only works inside the event’s check-in window)'
      }
      className="flex items-center gap-2 disabled:opacity-50"
    >
      <span
        aria-hidden
        className={`relative h-[18px] w-8 flex-none rounded-full transition-colors ${
          optimistic ? (live ? 'bg-success' : 'bg-secondary/50') : 'bg-line'
        }`}
      >
        <span
          className={`absolute top-[3px] size-3 rounded-full bg-white transition-all ${
            optimistic ? 'left-[17px]' : 'left-[3px]'
          }`}
        />
      </span>
      <span
        className={`text-xs font-semibold ${
          optimistic ? (live ? 'text-success' : 'text-muted') : 'text-[#A99E8F]'
        }`}
      >
        {label}
      </span>
    </button>
  )
}
