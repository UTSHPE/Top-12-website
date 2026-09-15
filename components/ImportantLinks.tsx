import { FaArrowUpRightFromSquare } from 'react-icons/fa6'
import { getImportantLinks, type Committee } from '@/lib/links'

/** The dot carries the committee's color; the label beside it stays neutral. */
const COMMITTEE_DOT: Record<Committee, string> = {
  Treasurer: 'bg-success',
  VPI: 'bg-primary',
  Secretary: 'bg-secondary',
  'Chapter Development': 'bg-gold',
}

/**
 * Neutral dot for a committee the database allows but this file doesn't know
 * about yet — a new row should look plain, never crash the officer console.
 */
function dotFor(committee: string): string {
  return COMMITTEE_DOT[committee as Committee] ?? 'bg-faint'
}

/** Same two columns for the header labels and every row, so they stay aligned. */
const LINK_COLS = 'grid-cols-[minmax(0,1fr)_11rem]'

export default async function ImportantLinks() {
  const links = await getImportantLinks()

  return (
    <section className="overflow-hidden rounded-lg bg-surface shadow-card">
      <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4">
        <h2 className="font-display text-[15px] font-bold">Important links</h2>
        <a href="#" className="text-[13px] font-semibold text-secondary hover:underline">
          Suggest a link
        </a>
      </div>

      {links.length === 0 ? (
        <p className="px-5 py-12 text-center text-sm text-muted">
          No links yet — add rows to `important_links` and they appear here.
        </p>
      ) : (
        <>
          <div
            className={`grid ${LINK_COLS} bg-surface-2 px-5 py-[11px] text-[11px] font-bold tracking-[.05em] text-faint uppercase`}
          >
            <span>Link</span>
            <span>Committee</span>
          </div>

          {links.map((link) => {
            // A relative or placeholder href stays in-page; a real URL opens
            // in its own tab so the officer doesn't lose the console.
            const external = link.href.startsWith('http')

            return (
              <a
                key={link.id}
                href={link.href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className={`rowlift relative grid ${LINK_COLS} items-center border-t border-black/6 bg-surface px-5 py-3.5 text-sm`}
              >
                {/* min-w-0 lets the purpose wrap instead of widening the column. */}
                <span className="min-w-0 pr-3">
                  <span className="font-display font-semibold text-ink">
                    {link.name}
                    <FaArrowUpRightFromSquare className="ml-1.5 inline size-2.5 text-primary" />
                  </span>
                  {link.purpose && (
                    <span className="mt-0.5 block text-[13px] text-muted">{link.purpose}</span>
                  )}
                </span>

                <span className="flex items-center gap-2 text-muted">
                  <span
                    className={`size-[7px] shrink-0 rounded-full ${dotFor(link.committee)}`}
                  />
                  {link.committee}
                </span>
              </a>
            )
          })}
        </>
      )}
    </section>
  )
}
