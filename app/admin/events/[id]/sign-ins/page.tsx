import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FaArrowLeft, FaTriangleExclamation } from 'react-icons/fa6'
import { getEventSignIns } from '@/lib/events'
import { formatDateLong } from '@/lib/format'
import AdminTopbar from '@/app/admin/AdminTopbar'
import RaffleList from './RaffleList'

// Never cached. The whole point of this page is being opened mid-meeting while
// people are still checking in, so a refresh has to show whoever arrived since.
export const revalidate = 0

/**
 * Everyone who checked into one event, as a paste-ready list of names.
 *
 * Officer-only, and reached only from the events table — nothing on the member
 * side links here. It needs no auth code of its own: proxy.ts guards every
 * `/admin/:path*` route, so an unauthenticated request never reaches this
 * component.
 *
 * Unlike the edit screen, this is NOT gated on `isUpcoming`. A raffle list is
 * wanted for an event that is live and for one that finished ten minutes ago —
 * gating it would take the page away at exactly the moment it gets used.
 */
export default async function EventSignInsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const report = await getEventSignIns(id)

  if (!report) notFound()

  const { event, names, duplicates } = report

  return (
    <>
      <AdminTopbar
        title="Raffle list"
        subtitle={`${event.title} · ${formatDateLong(event.date)} · ${event.committee}`}
        action={
          <Link
            href="/admin/events"
            className="flex flex-none items-center gap-2 rounded-sm border-[1.5px] border-line px-4 py-2 text-sm font-semibold text-muted transition-colors hover:text-ink"
          >
            <FaArrowLeft aria-hidden className="size-3" />
            Back to events
          </Link>
        }
      />

      <div className="min-w-0 flex-1 px-5 py-6 md:px-7">
        <div className="mx-auto w-full max-w-[680px]">
          {duplicates.length > 0 && (
            <div className="mb-4">
              <WarningStrip
                title={
                  duplicates.length === 1
                    ? 'Two members share a name.'
                    : 'Some members share a name.'
                }
                detail={`${duplicates
                  .map((name) => `“${name}”`)
                  .join(', ')} ${
                  duplicates.length === 1 ? 'appears' : 'appear'
                } more than once. Both entries are kept on purpose — they are different people, and merging them would halve one of their odds — but the wheel can't tell them apart, so check the EID with whoever wins before handing over the prize.`}
              />
            </div>
          )}

          <section className="rounded-lg bg-surface p-5 shadow-card">
            <div className="mb-4">
              <h2 className="font-display text-[15px] font-bold">
                {names.length} {names.length === 1 ? 'name' : 'names'} checked in
              </h2>
              <p className="mt-0.5 text-xs text-faint">
                One per line, ready to paste into a wheel. Edit it freely — striking
                a name out here changes nothing recorded against the event. Refresh to
                pull in anyone who has checked in since.
              </p>
            </div>

            <RaffleList names={names} />
          </section>
        </div>
      </div>
    </>
  )
}

/**
 * ErrorStrip in amber. Same shape deliberately — an officer already reads that
 * component as "read this line before carrying on" — but this is a caveat about
 * a list that is correct, not a failure, so it takes the warning token and the
 * triangle rather than error red and the info circle.
 */
function WarningStrip({ title, detail }: { title: string; detail: string }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-md border-l-4 border-warning bg-surface px-[18px] py-3.5 shadow-[0_3px_10px_rgba(0,0,0,.05)]"
    >
      <FaTriangleExclamation aria-hidden className="size-[17px] flex-none text-warning" />
      <p className="text-sm text-body">
        <b className="text-ink">{title}</b> {detail}
      </p>
    </div>
  )
}
