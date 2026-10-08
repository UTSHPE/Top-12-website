import Link from 'next/link'
import { FaPlus } from 'react-icons/fa6'

/**
 * Shared console header — 62px on a laptop, allowed to grow on a phone so a
 * long subtitle (RTC, events) wraps to a second line instead of truncating.
 */
export default function AdminTopbar({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <header className="flex min-h-[62px] flex-none items-center justify-between gap-4 border-b border-hairline bg-surface px-4 py-3 md:h-[62px] md:px-7 md:py-0">
      <div className="min-w-0">
        <div className="font-display truncate text-lg font-extrabold">{title}</div>
        {subtitle && (
          <div className="line-clamp-2 text-xs text-faint md:truncate">{subtitle}</div>
        )}
      </div>
      {action}
    </header>
  )
}

/** Desktop only — on a phone the bottom tab bar's Create does this job. */
export function NewEventButton() {
  return (
    <Link
      href="/admin/create-event"
      className="hidden flex-none items-center gap-2 md:flex rounded-sm bg-primary-bright px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
    >
      <FaPlus aria-hidden className="size-3" />
      New Event
    </Link>
  )
}
