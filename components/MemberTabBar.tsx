'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FaCalendarDay,
  FaCircleCheck,
  FaHouse,
  FaRankingStar,
  FaUserShield,
} from 'react-icons/fa6'
import type { IconType } from 'react-icons'

const TABS: { href: string; label: string; Icon: IconType }[] = [
  { href: '/', label: 'Home', Icon: FaHouse },
  { href: '/events', label: 'Events', Icon: FaCalendarDay },
  { href: '/checkin', label: 'Check in', Icon: FaCircleCheck },
  { href: '/leaderboard', label: 'Board', Icon: FaRankingStar },
  // Same target as the desktop "Officer sign in" button: the /admin proxy sends
  // signed-out visitors to /login and signed-in officers straight through.
  { href: '/admin', label: 'Officer', Icon: FaUserShield },
]

/** Prefix match, so /checkin/ABC123 still lights up Check in. Home is exact. */
function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * The member site's phone navigation — the same shape as the officer console's
 * tab bar (app/admin/AdminNav.tsx) in the member site's light colors.
 *
 * Render it as the LAST element on a page: alongside the fixed bar it leaves an
 * in-flow spacer of the same height, so the end of the page scrolls clear of
 * the bar instead of sitting underneath it.
 */
export default function MemberTabBar() {
  const pathname = usePathname()

  return (
    <>
      <div aria-hidden className="h-[calc(64px+env(safe-area-inset-bottom))] flex-none md:hidden" />

      <nav
        aria-label="Site"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-hairline bg-surface pb-[env(safe-area-inset-bottom)] shadow-raised md:hidden"
      >
        {TABS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href)
          const checkIn = href === '/checkin'

          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                active ? 'text-primary' : 'text-muted hover:text-ink'
              }`}
            >
              {checkIn ? (
                // Check-in is the one thing members come here to do, so it
                // gets the CTA orange and sits slightly proud of the bar.
                <span className="-mt-5 flex size-11 items-center justify-center rounded-full bg-primary-bright text-white shadow-cta">
                  <Icon aria-hidden className="size-5" />
                </span>
              ) : (
                <Icon aria-hidden className="size-5" />
              )}
              {label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
