import { FaRegClock, FaLocationDot } from 'react-icons/fa6'
import { categoryStyle, type ChapterEvent } from '@/lib/events'
import { formatDay, formatDayTime, formatMonth, formatPoints } from '@/lib/format'
import Avatar from '@/components/Avatar'
import StatusPill from '@/components/StatusPill'

/**
 * The member-facing event ticket: a tinted top block, a perforation with two
 * notches bitten out of the card edges, and a tear-off stub carrying the host
 * and the points on offer.
 *
 * The notches are filled with the page background, so this card is only ever
 * placed on `bg-bg`.
 */
export default function EventCard({ event }: { event: ChapterEvent }) {
  const category = categoryStyle(event.eventType)
  const host = event.host || 'UT SHPE'

  return (
    <article className="lift relative rounded-lg bg-surface shadow-raised">
      <div
        className="flex items-start justify-between gap-3 rounded-t-lg px-[18px] pt-4 pb-[15px]"
        style={{ background: category.tint }}
      >
        <div className="flex items-center gap-3">
          <div
            className="min-w-[50px] flex-none rounded-md px-2.5 py-2 text-center text-white"
            style={{ background: category.accent, boxShadow: category.chipShadow }}
          >
            <div className="text-[10px] font-bold tracking-[.04em] uppercase">
              {formatMonth(event.start)}
            </div>
            <div className="font-display text-2xl leading-none font-extrabold">
              {formatDay(event.start)}
            </div>
          </div>

          <div>
            <div
              className="text-[11px] font-extrabold tracking-[.05em] uppercase"
              style={{ color: category.accent }}
            >
              {category.label}
            </div>
            <div
              className="mt-[3px] flex items-center gap-1.5 text-xs"
              style={{ color: category.meta }}
            >
              <FaRegClock className="size-3 flex-none" aria-hidden />
              {formatDayTime(event.start)}
            </div>
            {event.location && (
              <div
                className="mt-0.5 flex items-center gap-1.5 text-xs"
                style={{ color: category.meta }}
              >
                <FaLocationDot className="size-3 flex-none" aria-hidden />
                {event.location}
              </div>
            )}
          </div>
        </div>

        <StatusPill isOpen={event.isOpen} />
      </div>

      {/* Perforation */}
      <div aria-hidden className="relative h-3.5">
        <div
          className="absolute top-1/2 right-3 left-3 border-t-2 border-dashed"
          style={{ borderColor: category.perforation }}
        />
        <div className="absolute -left-[7px] top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-bg" />
        <div className="absolute -right-[7px] top-1/2 size-3.5 -translate-y-1/2 rounded-full bg-bg" />
      </div>

      <div className="px-[18px] pt-1 pb-[18px]">
        <h3 className="font-display mb-3.5 text-[19px] leading-tight font-extrabold">
          {event.title}
        </h3>

        <div className="flex items-center gap-2.5 rounded-[13px] bg-surface-2 px-2.5 py-2">
          <Avatar
            name={host}
            size={40}
            className="shadow-[0_0_0_2px_#fff,0_3px_8px_rgba(0,0,0,.15)]"
          />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[10px] font-bold tracking-[.04em] text-[#9A8B73] uppercase">
              Hosted by
            </div>
            <div className="truncate text-sm font-bold text-ink">{host}</div>
          </div>
          <span className="flex-none rounded-full bg-success-bg px-2.5 py-1.5 text-[13px] font-extrabold text-success">
            +{formatPoints(event.points)}
          </span>
        </div>
      </div>
    </article>
  )
}
