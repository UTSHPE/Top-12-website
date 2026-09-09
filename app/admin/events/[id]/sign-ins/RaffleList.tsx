'use client'

import { useRef, useState } from 'react'
import { FaArrowRotateLeft, FaCheck, FaRegCopy } from 'react-icons/fa6'

const SUCCESS_MS = 2000

/**
 * The raffle list itself: an editable text field, one name per line.
 *
 * A plain <textarea> rather than a styled list, because that is what a wheel
 * site can actually receive. Copying a rendered <ul> carries markup, and the
 * spinners either paste it as one giant slice or explode it into a pile of
 * empty ones. It is also the fallback for when the clipboard write is refused
 * — the text is right there to select by hand.
 *
 * Editable on purpose: an officer strikes themselves, the committee, and last
 * round's winner before spinning again.
 */
export default function RaffleList({ names }: { names: string[] }) {
  const seed = names.join('\n')

  // Seeded once, at mount. There is deliberately no effect re-syncing this when
  // `names` changes: re-seeding would wipe an officer's in-progress edits mid
  // meeting, react-hooks/set-state-in-effect rejects the pattern anyway, and a
  // browser refresh — the way this page picks up new arrivals — remounts the
  // component and re-seeds it for free. On a soft refresh the seed moves while
  // the text doesn't, which simply surfaces the Reset button.
  const [text, setText] = useState(seed)
  const [status, setStatus] = useState('')
  const [copied, setCopied] = useState(false)

  const areaRef = useRef<HTMLTextAreaElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // What the wheel will actually see: blank lines aren't entries.
  const entries = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')

  const noun = entries.length === 1 ? 'name' : 'names'

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setStatus(`${entries.length} ${noun} copied — paste into the wheel.`)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), SUCCESS_MS)
    } catch {
      // Refused clipboard permission, or an insecure origin. Select the text so
      // the keyboard shortcut is one keystroke away rather than a dead end.
      areaRef.current?.select()
      setStatus('The browser blocked the copy. The list is selected — press Ctrl+C.')
    }
  }

  function reset() {
    setText(seed)
    setStatus(`List reset to the ${names.length} ${names.length === 1 ? 'name' : 'names'} checked in.`)
  }

  return (
    <div>
      <label htmlFor="raffle-list" className="sr-only">
        Raffle entries, one name per line
      </label>
      <textarea
        id="raffle-list"
        ref={areaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
        placeholder="Nobody has checked in yet. Names appear here as they arrive — refresh the page to pull in the latest."
        className="min-h-[380px] w-full resize-y rounded-sm border-[1.5px] border-line bg-surface p-3.5 text-sm leading-7 outline-none transition-colors focus:border-primary-bright"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={copy}
          disabled={entries.length === 0}
          className={`flex items-center gap-2 rounded-sm px-4 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-40 ${
            copied ? 'bg-success' : 'bg-primary-bright hover:bg-primary-hover'
          }`}
        >
          {copied ? (
            <FaCheck aria-hidden className="size-3.5" />
          ) : (
            <FaRegCopy aria-hidden className="size-3.5" />
          )}
          {copied ? 'Copied' : `Copy ${entries.length} ${noun}`}
        </button>

        {/* Only worth showing once there is something to undo. */}
        {text !== seed && (
          <button
            type="button"
            onClick={reset}
            className="flex items-center gap-2 rounded-sm border-[1.5px] border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            <FaArrowRotateLeft aria-hidden className="size-3" />
            Reset
          </button>
        )}
      </div>

      {/* Polite, never assertive: this fires on every single spin, and an
          assertive region would cut off whatever the officer is saying to the
          room through their screen reader. Always rendered so a later change is
          announced rather than missed. */}
      <p aria-live="polite" className="mt-2 min-h-5 text-xs text-faint">
        {status}
      </p>
    </div>
  )
}
