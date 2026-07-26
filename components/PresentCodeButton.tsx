'use client'

import { useEffect, useState } from 'react'
import { FaExpand } from 'react-icons/fa6'
import CodeDisplay from '@/components/CodeDisplay'

/**
 * Puts an access code on the projector.
 *
 * Shared by the create-event signature moment and the dashboard's event table,
 * so a code an officer created last week presents exactly like one they just
 * made.
 */
export default function PresentCodeButton({
  code,
  eventTitle,
  variant = 'cta',
}: {
  code: string
  /** Shown above the code so the room knows which event it belongs to. */
  eventTitle?: string
  /** `cta` is the full orange button; `icon` sits inline in a table row. */
  variant?: 'cta' | 'icon'
}) {
  const [presenting, setPresenting] = useState(false)

  useEffect(() => {
    if (!presenting) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresenting(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [presenting])

  return (
    <>
      {variant === 'cta' ? (
        <button
          onClick={() => setPresenting(true)}
          className="flex items-center gap-2 rounded-sm bg-primary-bright px-5 py-2.5 text-sm font-bold text-white"
        >
          <FaExpand aria-hidden className="size-3.5" />
          Present fullscreen
        </button>
      ) : (
        <button
          onClick={() => setPresenting(true)}
          aria-label={
            eventTitle ? `Present the code for ${eventTitle} fullscreen` : 'Present code fullscreen'
          }
          title="Present fullscreen"
          className="flex size-7 flex-none items-center justify-center rounded-sm text-[#A99E8F] transition-colors hover:bg-primary-bright/10 hover:text-primary-bright"
        >
          <FaExpand aria-hidden className="size-3" />
        </button>
      )}

      {presenting && (
        <div
          role="dialog"
          aria-label={eventTitle ? `Check-in code for ${eventTitle}` : 'Check-in code'}
          onClick={() => setPresenting(false)}
          className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center gap-[5vh] overflow-hidden bg-ink p-6"
        >
          <p className="text-center text-xs font-semibold tracking-[.12em] text-[#C7BCAE] uppercase sm:text-sm">
            {eventTitle || 'Check-in code'}
          </p>
          <CodeDisplay code={code} size="xl" tone="dark" />
          <p className="text-center text-xs text-[#A99E8F]">
            Click anywhere or press Esc to exit
          </p>
        </div>
      )}
    </>
  )
}
