import { getOpenEvent } from '@/lib/events'
import { formatPoints, formatTime } from '@/lib/format'
import { LiveDot } from '@/components/StatusPill'

/**
 * Page heading, plus a banner naming the event that's open right now.
 *
 * Reads the open event on the server so the code itself never reaches the
 * browser — it tells a member they're in the right place without handing the
 * page a valid code to display.
 */
export default async function CheckInHeader() {
  const open = await getOpenEvent()

  return (
    <header className="mb-6">
      <h1 className="font-display text-[28px] leading-tight font-extrabold tracking-[-.6px] sm:text-[32px]">
        Check in
      </h1>
      <p className="mt-1.5 text-[15px] text-body">
        Enter your EID and the code on the slide.
      </p>

      {open && (
        <div className="mt-5 flex items-center gap-3 rounded-md bg-surface px-4 py-3.5 shadow-card">
          <LiveDot />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{open.title}</p>
            <p className="text-xs text-faint">
              Open until {formatTime(open.checkInEnd)} · {formatPoints(open.points)} pts
            </p>
          </div>
        </div>
      )}
    </header>
  )
}
