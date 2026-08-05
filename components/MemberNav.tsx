'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from '@/components/Logo'

// "Home" is dropped on phones — the logo already goes there, and the row has
// to fit a 320px viewport alongside the Check In button.
const LINKS = [
  { href: '/', label: 'Home', phone: false },
  { href: '/events', label: 'Events', phone: true },
  { href: '/leaderboard', label: 'Leaderboard', phone: true },
]

/**
 * The nav's filled-button treatment, shared by both CTAs so they can't drift.
 *
 * Colors come from the theme tokens rather than literals — `primary-bright` is
 * the CTA orange and `primary-hover` its hover state, both declared in
 * globals.css. The focus ring is not here on purpose: globals.css styles
 * `:focus-visible` globally, so both links already share one.
 */
const NAV_BUTTON =
  'flex-none rounded-sm bg-primary-bright px-3 py-2 font-bold text-white transition-colors hover:bg-primary-hover sm:px-4 sm:py-2.5'

export default function MemberNav() {
  const pathname = usePathname()

  return (
    <header className="flex h-[62px] flex-none items-center justify-between border-b border-hairline bg-surface px-5 sm:px-[30px]">
      <Link href="/" aria-label="UT SHPE home" className="flex-none">
        <Logo height={24} className="sm:hidden" />
        <Logo height={30} className="hidden sm:inline-flex" />
      </Link>

      <nav className="flex items-center gap-3 text-[13px] font-medium text-body sm:gap-[26px] sm:text-sm">
        {LINKS.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`ncta ${link.phone ? '' : 'hidden sm:inline'} ${
                active ? 'font-bold text-primary' : ''
              }`}
            >
              {link.label}
            </Link>
          )
        })}
        {/* Both CTAs sit in their own group: the nav's 26px rhythm is spaced
            for text links and reads as a gap between two adjacent filled
            buttons, so the pair gets a tighter gap of its own. */}
        <span className="flex items-center gap-2 sm:gap-2.5">
          <Link
            href="/checkin"
            aria-current={pathname.startsWith('/checkin') ? 'page' : undefined}
            className={NAV_BUTTON}
          >
            Check in
          </Link>

          {/* Points at the console, not the login form: the /admin proxy
              bounces signed-out visitors to /login and lets signed-in officers
              straight through, so one link is correct in both cases. Stays
              hidden on phones — the row has to fit a 320px viewport. */}
          <Link href="/admin" className={`${NAV_BUTTON} hidden sm:inline-flex`}>
            Officer sign in
          </Link>
        </span>
      </nav>
    </header>
  )
}
