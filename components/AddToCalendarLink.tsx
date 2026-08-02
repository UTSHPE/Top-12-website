import { FaRegCalendarPlus } from 'react-icons/fa6'
import { googleCalendarUrl } from '@/lib/calendar'
import type { ChapterEvent } from '@/lib/events'

/**
 * Sends a member to Google's "add event" screen with everything pre-filled.
 * The caller owns the styling — this ships on a white ticket, a phone row and
 * the orange hero panel, which want three different treatments.
 */
export default function AddToCalendarLink({
  event,
  className = '',
  label = 'Add to calendar',
}: {
  event: ChapterEvent
  className?: string
  label?: string
}) {
  return (
    <a
      href={googleCalendarUrl(event)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Add ${event.title} to your Google Calendar`}
      className={className}
    >
      <FaRegCalendarPlus aria-hidden className="size-3.5 flex-none" />
      {label}
    </a>
  )
}
