'use client'

import { useState } from 'react'
import { FaCar, FaRegCopy } from 'react-icons/fa6'
import CodeDisplay from '@/components/CodeDisplay'

/**
 * An event's driver code, for the officer to send to their drivers.
 *
 * Deliberately has no Present button. The attendee code goes on the projector
 * for the whole room; this one goes to the drivers only — on a slide, anyone
 * who sees it can claim driver points. Copy is the whole hand-off.
 */
export default function DriverCode({
  code,
  tone = 'light',
}: {
  code: string
  /** `dark` on the ink success card, `light` on surfaces. */
  tone?: 'dark' | 'light'
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked — the code is on screen either way.
    }
  }

  const dark = tone === 'dark'

  return (
    <div className="flex flex-col items-center gap-2.5">
      <p
        className={`flex items-center gap-1.5 text-[11px] font-bold tracking-[.05em] uppercase ${
          dark ? 'text-[#C7BCAE]' : 'text-faint'
        }`}
      >
        <FaCar aria-hidden className="size-3" />
        Driver code
      </p>
      <CodeDisplay code={code} size="sm" tone={tone} />
      <button
        type="button"
        onClick={copy}
        className={`flex items-center gap-1.5 rounded-sm px-3.5 py-1.5 text-[13px] font-semibold ${
          dark ? 'bg-white/12 text-white' : 'bg-surface-2 text-muted hover:text-ink'
        }`}
      >
        <FaRegCopy aria-hidden className="size-3" />
        {copied ? 'Copied' : 'Copy driver code'}
      </button>
      <p className={`text-[12px] ${dark ? 'text-[#A99E8F]' : 'text-faint'}`}>
        Send this to your drivers — don&apos;t put it on the slide.
      </p>
    </div>
  )
}
