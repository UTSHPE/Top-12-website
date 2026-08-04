'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { FaCheck, FaCircleInfo } from 'react-icons/fa6'
import { formatPoints } from '@/lib/format'
import { CODE_LENGTH, keepCodeChars } from '@/lib/accessCodeFormat'

type Success = {
  duplicate: boolean
  eventName: string
  points: number
  rank: number | null
  message: string
}

/**
 * The member check-in form.
 *
 * Everything that decides whether a code is valid happens on the server — this
 * posts to /api/checkin and renders whatever comes back. It deliberately never
 * touches Supabase: the anon key ships to the browser, so a client-side lookup
 * against `events` would let anyone enumerate valid codes.
 *
 * The code boxes are plain inputs, not the dashed-orange CodeDisplay. That
 * treatment means "a code to share" and belongs on the officer's screen; the
 * member is typing one in, which is the opposite direction.
 */
export default function CheckInForm({ initialCode = '' }: { initialCode?: string }) {
  const [eid, setEid] = useState('')
  const [chars, setChars] = useState<string[]>(() => padCode(initialCode))
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [success, setSuccess] = useState<Success | null>(null)
  const boxes = useRef<(HTMLInputElement | null)[]>([])

  const code = chars.join('')
  const ready = eid.trim().length > 0 && code.length === CODE_LENGTH

  function writeChars(next: string[], focusIndex?: number) {
    setChars(next)
    setError('')
    if (focusIndex !== undefined) {
      boxes.current[Math.min(focusIndex, CODE_LENGTH - 1)]?.focus()
    }
  }

  function handleBoxChange(index: number, raw: string) {
    const typed = keepCodeChars(raw)
    if (!typed) return

    // One field accepts a whole pasted code — people paste all six at once.
    const next = [...chars]
    for (let i = 0; i < typed.length && index + i < CODE_LENGTH; i++) {
      next[index + i] = typed[i]!
    }
    writeChars(next, index + typed.length)
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const next = [...chars]
      // Backspace in an empty box steps back and clears the previous one.
      if (!next[index] && index > 0) {
        next[index - 1] = ''
        writeChars(next, index - 1)
      } else {
        next[index] = ''
        writeChars(next, index)
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      boxes.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      boxes.current[index + 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = keepCodeChars(e.clipboardData.getData('text'))
    if (!pasted) return
    e.preventDefault()
    writeChars(padCode(pasted), pasted.length)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!ready || pending) return

    setPending(true)
    setError('')
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eid, code }),
      })
      const data = await res.json()

      if (data.ok) {
        setSuccess(data as Success)
      } else {
        setError(data.message ?? 'Something went wrong. Try again.')
      }
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  if (success) return <SuccessCard result={success} />

  return (
    <form onSubmit={submit} className="rounded-lg bg-surface p-6 shadow-card sm:p-7">
      <div className="mb-5">
        <label
          htmlFor="eid"
          className="mb-1.5 block text-[11px] font-bold tracking-[.05em] text-faint uppercase"
        >
          UT EID
        </label>
        <input
          id="eid"
          name="eid"
          value={eid}
          onChange={(e) => {
            setEid(e.target.value)
            setError('')
          }}
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="e.g. abc1234"
          className="w-full rounded-sm border border-line bg-surface-2 px-3.5 py-3 text-[15px] lowercase placeholder:normal-case placeholder:text-faint/70 focus:border-primary focus:outline-none"
        />
      </div>

      <fieldset className="mb-6">
        <legend className="mb-1.5 block text-[11px] font-bold tracking-[.05em] text-faint uppercase">
          Check-in code
        </legend>
        <div className="flex justify-between gap-1.5 sm:gap-2.5">
          {chars.map((char, i) => (
            <input
              key={i}
              ref={(el) => {
                boxes.current[i] = el
              }}
              value={char}
              onChange={(e) => handleBoxChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              inputMode="text"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              aria-label={`Code character ${i + 1} of ${CODE_LENGTH}`}
              className="h-[58px] w-full min-w-0 rounded-md border-2 border-line bg-surface-2 text-center font-mono text-[26px] font-bold uppercase caret-primary focus:border-primary focus:bg-surface focus:outline-none sm:h-16 sm:text-[30px]"
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-faint">
          Six characters, letters and numbers, shown on the slide. You can paste
          the whole code.
        </p>
      </fieldset>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2.5 rounded-md border-l-4 border-error bg-surface-2 px-4 py-3"
        >
          <FaCircleInfo aria-hidden className="mt-0.5 size-4 flex-none text-error" />
          <p className="text-sm text-body">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={!ready || pending}
        className="w-full rounded-sm bg-primary-bright py-3.5 text-[15px] font-bold text-white shadow-cta transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-primary-bright/40 disabled:shadow-none"
      >
        {pending ? 'Checking in…' : 'Check in'}
      </button>
    </form>
  )
}

function SuccessCard({ result }: { result: Success }) {
  return (
    <div className="rounded-lg bg-surface p-8 text-center shadow-card">
      <div className="mx-auto mb-5 flex size-[68px] animate-popcheck items-center justify-center rounded-full bg-success-bg">
        <FaCheck aria-hidden className="size-7 text-success" />
      </div>

      <h1 className="font-display text-[26px] leading-tight font-extrabold tracking-[-.5px]">
        {result.duplicate ? "You're already checked in!" : "You're checked in!"}
      </h1>

      <p className="mt-2 text-[15px] text-body">
        {result.duplicate ? 'Already counted for ' : 'Checked in to '}
        <b className="text-ink">{result.eventName}</b>
      </p>

      {!result.duplicate && (
        <p className="mt-4 font-display text-[32px] font-extrabold text-success">
          +{formatPoints(result.points)}
          <span className="ml-1.5 text-base font-bold">pts</span>
        </p>
      )}

      {result.rank !== null && (
        <p className="mt-1 text-sm text-muted">
          You&apos;re <b className="text-primary">#{result.rank}</b> on the chapter board.
        </p>
      )}

      <Link
        href="/leaderboard"
        className="mt-6 inline-flex w-full items-center justify-center rounded-sm bg-primary-bright py-3.5 text-[15px] font-bold text-white shadow-cta transition-colors hover:bg-primary-hover"
      >
        See the leaderboard
      </Link>
    </div>
  )
}

/** Normalize any starting value into exactly CODE_LENGTH slots. */
function padCode(raw: string): string[] {
  const chars = keepCodeChars(raw).slice(0, CODE_LENGTH)
  return Array.from({ length: CODE_LENGTH }, (_, i) => chars[i] ?? '')
}
