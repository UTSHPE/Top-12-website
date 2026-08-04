'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FaTrash, FaTriangleExclamation } from 'react-icons/fa6'
import { deleteEvent } from '@/app/actions/deleteEvent'

/**
 * Type-to-confirm delete.
 *
 * Deleting an event takes its attendance history with it and reorders the
 * leaderboard, so the dialog states the exact damage — "This will permanently
 * delete 47 check-ins" — and makes the officer type the event name. A mis-click
 * cannot get through it.
 *
 * The delete is a soft delete: rows are stamped `deleted_at`, not removed, and
 * can be restored from SQL. The copy stays blunt anyway, because from the
 * chapter's point of view the points are gone until someone intervenes.
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
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const matches = typed.trim() === title.trim()

  function close() {
    setOpen(false)
    setTyped('')
    setError('')
  }

  function remove() {
    if (!matches) return
    setError('')
    startTransition(async () => {
      try {
        await deleteEvent(eventId, typed)
        close()
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Delete failed.')
      }
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label={`Delete ${title}`}
        title={`Delete ${title}`}
        className="flex size-8 items-center justify-center rounded-sm text-[#A99E8F] transition-colors hover:bg-error/10 hover:text-error"
      >
        <FaTrash aria-hidden className="size-3.5" />
      </button>
    )
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Delete ${title}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 px-5"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) close()
      }}
    >
      <div className="w-full max-w-[420px] rounded-lg bg-surface p-6 text-left shadow-shell">
        <div className="mb-4 flex items-start gap-3">
          <span className="flex size-9 flex-none items-center justify-center rounded-full bg-error/10">
            <FaTriangleExclamation aria-hidden className="size-4 text-error" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-[17px] leading-tight font-bold">
              Delete this event?
            </h2>
            <p className="mt-1 text-sm text-body">
              {headcount > 0 ? (
                <>
                  This will permanently delete{' '}
                  <b className="text-error">
                    {headcount} check-in{headcount === 1 ? '' : 's'}
                  </b>{' '}
                  and change the leaderboard.
                </>
              ) : (
                <>No one has checked in to this event yet.</>
              )}
            </p>
          </div>
        </div>

        <label
          htmlFor="confirm-name"
          className="mb-1.5 block text-[11px] font-bold tracking-[.05em] text-faint uppercase"
        >
          Type the event name to confirm
        </label>
        <p className="mb-2 truncate rounded-sm bg-surface-2 px-3 py-2 text-sm font-bold text-ink">
          {title}
        </p>
        <input
          id="confirm-name"
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value)
            setError('')
          }}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          placeholder="Event name"
          className="w-full rounded-sm border border-line bg-surface px-3 py-2.5 text-sm focus:border-error focus:outline-none"
        />

        {error && <p className="mt-2 text-xs leading-tight text-error">{error}</p>}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={close}
            disabled={pending}
            className="rounded-sm px-3 py-2 text-sm font-semibold text-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            onClick={remove}
            disabled={!matches || pending}
            className="rounded-sm bg-error px-4 py-2 text-sm font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? 'Deleting…' : 'Delete event'}
          </button>
        </div>
      </div>
    </div>
  )
}
