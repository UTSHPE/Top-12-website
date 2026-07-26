import Link from 'next/link'
import { FaPlus } from 'react-icons/fa6'

/** Shared 62px console header. */
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
    <header className="flex h-[62px] flex-none items-center justify-between gap-4 border-b border-hairline bg-surface px-5 md:px-7">
      <div className="min-w-0">
        <div className="font-display truncate text-lg font-extrabold">{title}</div>
        {subtitle && <div className="truncate text-xs text-faint">{subtitle}</div>}
      </div>
      {action}
    </header>
  )
}

export function NewEventButton() {
  return (
    <Link
      href="/admin/create-event"
      className="flex flex-none items-center gap-2 rounded-sm bg-primary-bright px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
    >
      <FaPlus aria-hidden className="size-3" />
      New Event
    </Link>
  )
}
