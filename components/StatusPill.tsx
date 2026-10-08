/** Pulsing dot used wherever the app says something is happening right now. */
export function LiveDot({ className = 'size-1.5 bg-success' }: { className?: string }) {
  return <span aria-hidden className={`inline-block flex-none animate-livepulse rounded-full ${className}`} />
}

/**
 * Check-in status on an event ticket. Only shown while check-in is open — the
 * events page lists upcoming events, so labelling the rest "Upcoming" said nothing.
 */
export default function StatusPill({ isOpen }: { isOpen: boolean }) {
  if (!isOpen) return null

  return (
    <span className="inline-flex flex-none items-center gap-1.5 rounded-full bg-surface px-2.5 py-[5px] text-[11px] font-bold text-success shadow-[0_2px_6px_rgba(0,0,0,.08)]">
      <LiveDot />
      Open now
    </span>
  )
}
