import Avatar from '@/components/Avatar'
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
  const subtitle = isMe ? 'Nice pace — keep checking in!' : subtitleOf(entry)

  return (
    <div
      className={`grid grid-cols-[28px_40px_1fr_auto] items-center gap-3.5 rounded-[13px] px-4 sm:grid-cols-[34px_40px_1fr_auto] ${
        isMe
          ? 'bg-primary py-[13px] text-white shadow-[0_8px_20px_rgba(191,87,0,.28)]'
          : 'rowlift bg-surface py-3 shadow-[0_2px_8px_rgba(0,0,0,.05)]'
      }`}
    >
      <div
        className={`font-display text-center font-extrabold ${isMe ? '' : 'text-faint'}`}
      >
        {entry.rank}
      </div>

      {isMe ? (
        <span className="flex size-10 flex-none items-center justify-center rounded-full bg-white/20 text-xs font-bold">
          You
        </span>
      ) : (
        <Avatar name={entry.name} size={40} />
      )}

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
