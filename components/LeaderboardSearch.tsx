'use client'

import { useMemo, useState } from 'react'
import { FaMagnifyingGlass, FaXmark } from 'react-icons/fa6'
import LeaderboardRow from '@/components/LeaderboardRow'
import { searchEntries, type PublicEntry } from '@/lib/leaderboardSearch'

/**
 * The searchable half of a leaderboard: a filter box and the rows under it.
 *
 * Filtering happens in the browser over a board that is already fully loaded —
 * about a hundred and thirty rows — so there is no round trip, no URL state and
 * no loading flicker between keystrokes. The matching itself lives in
 * lib/leaderboardSearch so it can be tested without a DOM.
 *
 * With no query this renders exactly what the page rendered before search
 * existed: the slice after the podium, capped, with the visitor's own row
 * pinned to the end if it falls outside that window. A query replaces both
 * behaviours — every match is listed, podium places included, and the pinned
 * row is dropped, because a second copy of a row already in the results is
 * just noise.
 *
 * The podium above stays put while searching. It is a banner for the top of
 * the chapter rather than part of this list, and blanking it on every
 * keystroke would make the page jump.
 */
export default function LeaderboardSearch({
  entries,
  podiumCount,
  visibleRows,
  placeholder = 'Search by name, major, or class',
}: {
  /** The whole board, in rank order, with EIDs already stripped. */
  entries: PublicEntry[]
  /** How many top places the podium already shows, and this list skips. */
  podiumCount: number
  /** Cap on rows shown when not searching. Omit for no cap. */
  visibleRows?: number
  placeholder?: string
}) {
  const [query, setQuery] = useState('')
  const trimmed = query.trim()

  const results = useMemo(() => searchEntries(entries, query), [entries, query])

  // Searching looks at the whole board; browsing starts below the podium.
  const listed =
    results ?? entries.slice(podiumCount, podiumCount + (visibleRows ?? entries.length))

  const me = entries.find((entry) => entry.isMe)
  const pinMe = !results && me !== undefined && !listed.includes(me)

  return (
    <>
      <div className="relative mb-3">
        <FaMagnifyingGlass
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3.5 size-3.5 -translate-y-1/2 text-faint"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label="Search the leaderboard"
          // Chrome draws its own clear button inside type="search"; hiding it
          // leaves only the styled one below, which matches the design tokens.
          className="w-full rounded-sm border-[1.5px] border-line bg-surface py-2.5 pr-10 pl-9 text-sm font-semibold outline-none transition-colors focus:border-primary-bright [&::-webkit-search-cancel-button]:hidden"
        />
        {trimmed && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Clear search"
            className="absolute top-1/2 right-2.5 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-faint transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <FaXmark aria-hidden className="size-3.5" />
          </button>
        )}
      </div>

      {/* Announced rather than only drawn, so the count reaches a screen reader
          that never sees the list shrink. */}
      {results && (
        <p role="status" aria-live="polite" className="mb-2 px-1 text-xs text-faint">
          {results.length === 0
            ? `No members match “${trimmed}”.`
            : `${results.length} ${results.length === 1 ? 'member' : 'members'} matching “${trimmed}”.`}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {listed.map((entry) => (
          <LeaderboardRow key={entry.rank} entry={entry} isMe={entry.isMe} />
        ))}
        {pinMe && me && <LeaderboardRow entry={me} isMe />}
      </div>
    </>
  )
}
