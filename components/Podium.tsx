import { FaCrown, FaStar } from 'react-icons/fa6'
import Avatar from '@/components/Avatar'
import { formatPoints } from '@/lib/format'
import type { LeaderboardEntry } from '@/lib/leaderboard'

type Place = 1 | 2 | 3

const MEDALS: Record<Place, {
  ring: string
  badgeBg: string
  badgeText: string
  pedestalBg: string
  pedestalBorder: string
  pointsColor: string
  labelColor: string
  avatarShadow: string
}> = {
  1: {
    ring: '#E8B923',
    badgeBg: '#E8B923',
    badgeText: '#4A3600',
    pedestalBg: 'rgba(232,185,35,.18)',
    pedestalBorder: 'rgba(232,185,35,.32)',
    pointsColor: '#E8B923',
    labelColor: '#E8D4A8',
    avatarShadow: '0 6px 16px rgba(232,185,35,.35)',
  },
  2: {
    ring: '#C7CDD4',
    badgeBg: '#C7CDD4',
    badgeText: '#2B2B2B',
    pedestalBg: 'rgba(199,205,212,.16)',
    pedestalBorder: 'rgba(199,205,212,.25)',
    pointsColor: '#FFFFFF',
    labelColor: '#C7BCAE',
    avatarShadow: '0 4px 12px rgba(0,0,0,.25)',
  },
  3: {
    ring: '#C77B3B',
    badgeBg: '#C77B3B',
    badgeText: '#FFFFFF',
    pedestalBg: 'rgba(199,123,59,.16)',
    pedestalBorder: 'rgba(199,123,59,.28)',
    pointsColor: '#C77B3B',
    labelColor: '#D8B48F',
    avatarShadow: '0 4px 12px rgba(0,0,0,.25)',
  },
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name

function PodiumSpot({ entry, place }: { entry: LeaderboardEntry; place: Place }) {
  const medal = MEDALS[place]
  const isChampion = place === 1

  return (
    <div
      className={`relative flex-1 text-center ${isChampion ? 'max-w-[162px]' : 'max-w-[150px]'}`}
    >
      {isChampion && (
        <>
          <FaStar
            aria-hidden
            className="absolute top-0.5 left-3 size-[9px] text-gold opacity-85"
          />
          <FaStar
            aria-hidden
            className="absolute top-3 right-[18px] size-[7px] text-gold opacity-70"
          />
          <FaStar
            aria-hidden
            className="absolute -top-0.5 right-[34px] size-1.5 text-white opacity-60"
          />
          <FaCrown
            aria-hidden
            className="mx-auto mb-1.5 size-5 text-gold drop-shadow-[0_2px_3px_rgba(0,0,0,.35)]"
          />
        </>
      )}

      <div
        className="relative mx-auto mb-2.5"
        style={{ width: isChampion ? 70 : 58 }}
      >
        <Avatar name={entry.name} size={isChampion ? 70 : 58} />
        {/* Medal ring drawn over the disc edge rather than as a disc border,
            so the monogram keeps its full diameter. */}
        <span
          className="absolute inset-0 rounded-full border-[3px]"
          style={{ borderColor: medal.ring, boxShadow: medal.avatarShadow }}
          aria-hidden
        />
        <span
          className="font-display absolute -bottom-[5px] flex items-center justify-center rounded-full border-[3px] border-ink font-extrabold"
          style={{
            right: isChampion ? 2 : -3,
            width: isChampion ? 26 : 24,
            height: isChampion ? 26 : 24,
            fontSize: isChampion ? 14 : 13,
            background: medal.badgeBg,
            color: medal.badgeText,
          }}
        >
          {place}
        </span>
      </div>

      <div className={`font-bold ${isChampion ? 'text-sm' : 'text-[13px]'}`}>
        {firstName(entry.name)}
      </div>
      <div className="mb-2 truncate text-[11px] text-[#A99E8F]">{entry.major ?? '—'}</div>

      <div
        className={`rounded-t-[14px] border ${isChampion ? 'pt-[26px] pb-4' : place === 2 ? 'pt-4 pb-3.5' : 'pt-[11px] pb-3'}`}
        style={{ background: medal.pedestalBg, borderColor: medal.pedestalBorder }}
      >
        <div
          className={`font-display font-extrabold ${isChampion ? 'text-[28px]' : 'text-[22px]'}`}
          style={{ color: medal.pointsColor }}
        >
          {formatPoints(entry.points)}
        </div>
        <div
          className="text-[10px] tracking-[.06em] uppercase"
          style={{ color: medal.labelColor }}
        >
          points
        </div>
      </div>
    </div>
  )
}

/** Top three, champion raised in the middle. Renders whatever exists. */
export default function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  const [first, second, third] = entries

  return (
    <div className="flex items-end justify-center gap-4">
      {second && <PodiumSpot entry={second} place={2} />}
      {first && <PodiumSpot entry={first} place={1} />}
      {third && <PodiumSpot entry={third} place={3} />}
    </div>
  )
}
