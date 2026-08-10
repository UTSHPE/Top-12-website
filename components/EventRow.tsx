import { categoryStyle, committeeLabel, type ChapterEvent } from '@/lib/events'
import { formatDay, formatMonth, formatPoints, formatTime } from '@/lib/format'
import { LiveDot } from '@/components/StatusPill'

/**
 * Compact event row for narrow screens. The phone layout is designed for the
 * size rather than being a shrunken ticket, so this is a separate component
 * from EventCard instead of a responsive variant of it.
 */
export default function EventRow({ event }: { event: ChapterEvent }) {
  const category = categoryStyle(event.eventType)

  return (
    <article className="rowlift flex items-center gap-3 rounded-[15px] bg-surface p-[15px] shadow-card">
      <div
        className="flex-none rounded-[11px] px-[11px] py-2 text-center"
        style={{ background: category.disc }}
      >
        <div
          className="text-[9px] font-bold uppercase"
          style={{ color: category.accent }}
        >
          {formatMonth(event.start)}
        </div>
        <div className="font-display text-xl leading-none font-extrabold">
          {formatDay(event.start)}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <div
          className="text-[10px] font-bold uppercase"
          style={{ color: category.accent }}
        >
          {committeeLabel(event)}
        </div>
        <h3 className="font-display my-px text-[15px] font-bold">{event.title}</h3>
        <div className="text-xs text-muted">
          {formatTime(event.start)}
          {event.location ? ` · ${event.location}` : ''}
        </div>
      </div>

      <div className="flex-none text-right">
        {event.isOpen && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success-bg px-2 py-1 text-[11px] font-bold text-success">
            <LiveDot className="size-[5px] bg-success" />
            Open
          </span>
        )}
        <div className="mt-[5px] text-[13px] font-extrabold text-success">
          +{formatPoints(event.points)}
        </div>
      </div>
    </article>
  )
}
