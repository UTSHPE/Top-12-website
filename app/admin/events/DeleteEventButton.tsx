'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FaTrash } from 'react-icons/fa6'
import { deleteEvent } from '@/app/actions/deleteEvent'

/**
 * Two-step delete. The first click arms it and states the consequence — an
 * event with check-ins takes its points history down with it — so nobody wipes
 * a real meeting by mis-clicking a row.
 */
export default function DeleteEventButton({
  eventId,
  title,
  headcount,
}: {
  eventId: string
  title: string
  headcount: number
}) {
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function remove() {
    setError('')
    startTransition(async () => {
      try {
        await deleteEvent(eventId)
        setConfirming(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed.')
      }
    })
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        aria-label={`Delete ${title}`}
        title={`Delete ${title}`}
        className="flex size-8 items-center justify-center rounded-sm text-[#A99E8F] transition-colors hover:bg-error/10 hover:text-error"
      >
        <FaTrash aria-hidden className="size-3.5" />
      </button>
    )
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex items-center gap-1.5">
        <button
          onClick={remove}
          disabled={pending}
          className="rounded-sm bg-error px-2.5 py-1.5 text-xs font-bold text-white disabled:opacity-60"
        >
          {pending ? 'Deleting…' : 'Delete'}
        </button>
        <button
          onClick={() => {
            setConfirming(false)
            setError('')
          }}
          disabled={pending}
          className="rounded-sm px-2 py-1.5 text-xs font-semibold text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
      {headcount > 0 && !error && (
        <span className="text-[11px] leading-tight text-error">
          Also removes {headcount} check-in{headcount === 1 ? '' : 's'}
        </span>
      )}
      {error && <span className="text-[11px] leading-tight text-error">{error}</span>}
    </div>
  )
}
