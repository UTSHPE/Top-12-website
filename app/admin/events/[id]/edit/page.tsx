import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FaRegClock } from 'react-icons/fa6'
import { getEventForEdit, isUpcoming } from '@/lib/events'
import { formatDateLong, formatTime } from '@/lib/format'
import AdminTopbar from '@/app/admin/AdminTopbar'
import EditEventForm from './EditEventForm'

export const revalidate = 0

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const event = await getEventForEdit(id)

  if (!event) notFound()

  // A past event renders an explanation rather than a 404 — an officer who
  // followed a stale link or left the tab open overnight needs to know WHY the
  // form is gone. The server action enforces the same rule independently.
  if (!isUpcoming(event)) {
    return (
      <>
        <AdminTopbar title="Can't edit this event" subtitle={event.title} />
        <div className="mx-auto w-full max-w-[560px] px-5 py-10 md:px-7">
          <div className="rounded-xl bg-surface p-7 text-center shadow-card">
            <span className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-surface-2">
              <FaRegClock aria-hidden className="size-4 text-faint" />
            </span>
            <h1 className="font-display mb-1.5 text-xl font-extrabold tracking-[-.3px]">
              This event has already started
            </h1>
            <p className="mb-6 text-sm text-muted">
              It began {formatDateLong(event.start)} at {formatTime(event.start)}. Only
              upcoming events can have their time or location changed.
            </p>
            <Link
              href="/admin/events"
              className="inline-block rounded-sm bg-primary-bright px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-primary-hover"
            >
              Back to events
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminTopbar
        title="Edit event"
        subtitle={`${formatDateLong(event.start)} · ${formatTime(event.start)}`}
      />
      <EditEventForm event={event} />
    </>
  )
}
