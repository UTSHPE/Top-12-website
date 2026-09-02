import { formatPoints } from '@/lib/format'
import type { LeaderboardEntry } from '@/lib/leaderboard'

/**
 * Everything a row actually renders. Deliberately NOT `LeaderboardEntry`: this
 * component never reads `eid`, and the searchable board strips it before it
 * reaches the browser. Naming that here keeps the two in step.
 */
type RowEntry = Omit<LeaderboardEntry, 'eid'>

/** "ChemE · Junior" — whichever half we actually have. */
function subtitleOf(entry: RowEntry): string {
  return [entry.major, entry.classYear].filter(Boolean).join(' · ')
}

export default function LeaderboardRow({
  entry,
  isMe = false,
}: {
  entry: RowEntry
  isMe?: boolean
}) {
  const subtitle = subtitleOf(entry)

  return (
    <div
      className={`grid grid-cols-[28px_1fr_auto] items-center gap-3.5 rounded-[13px] px-4 sm:grid-cols-[34px_1fr_auto] ${
        isMe
          ? 'bg-primary py-[13px] text-white shadow-[0_8px_20px_rgba(191,87,0,.28)]'
          : 'rowlift bg-surface py-3 shadow-[0_2px_8px_rgba(0,0,0,.05)]'
      }`}
    >
      {/* Every position in the list reads in SHPE blue, top three included —
          a rank that reaches a row through search looks the same as any other.
          Your own row keeps white, which is what reads on the orange fill. */}
      <div
        className={`font-display text-center font-extrabold ${
          isMe ? '' : 'text-secondary'
        }`}
      >
        {entry.rank}
      </div>

      <div className="min-w-0">
        <div className="truncate text-[15px] font-bold">
          {isMe ? `You (${entry.name})` : entry.name}
        </div>
        {subtitle && (
          <div className={`truncate text-xs ${isMe ? 'text-white/80' : 'text-faint'}`}>
            {subtitle}
          </div>
        )}
      </div>

      <div className="font-display text-[17px] font-extrabold">
        {formatPoints(entry.points)}{' '}
        <span className={`font-sans text-xs ${isMe ? 'text-white/80' : 'text-faint'}`}>
          pts
        </span>
      </div>
    </div>
  )
}
