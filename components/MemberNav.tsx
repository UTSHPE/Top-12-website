'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Logo from '@/components/Logo'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Events' },
  { href: '/leaderboard', label: 'Leaderboard' },
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
  'flex-none rounded-sm bg-primary-bright px-4 py-2.5 font-bold text-white transition-colors hover:bg-primary-hover'

/**
 * The member header. Desktop only for navigation: under `md` it is just the
 * logo, and every link — Officer sign in included, which the old phone row had
 * no room for — lives in MemberTabBar at the bottom of the screen.
 */
export default function MemberNav() {
  const pathname = usePathname()

  return (
    <header className="flex h-[62px] flex-none items-center justify-between border-b border-hairline bg-surface px-5 sm:px-[30px]">
      {/* Two sizes, and the display utility has to sit on a wrapper rather than
          on Logo itself. Logo hard-codes `inline-flex` on its own root, and
          Tailwind emits `.hidden` *before* `.inline-flex` in the utilities
          layer — same specificity, so the component's class won and the phone
          rendered both lockups side by side. On separate elements there is no
          conflict to lose. */}
      <Link href="/" aria-label="UT SHPE home" className="flex-none">
        <span className="sm:hidden">
          <Logo height={24} />
        </span>
        <span className="hidden sm:block">
          <Logo height={30} />
        </span>
      </Link>

      <nav className="hidden items-center gap-[26px] text-sm font-medium text-body md:flex">
        {LINKS.map((link) => {
          const active = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`ncta ${active ? 'font-bold text-primary' : ''}`}
            >
              {link.label}
            </Link>
          )
        })}
        {/* Both CTAs sit in their own group: the nav's 26px rhythm is spaced
            for text links and reads as a gap between two adjacent filled
            buttons, so the pair gets a tighter gap of its own. */}
        <span className="flex items-center gap-2.5">
          <Link
            href="/checkin"
            aria-current={pathname.startsWith('/checkin') ? 'page' : undefined}
            className={NAV_BUTTON}
          >
            Check in
          </Link>

          {/* Points at the console, not the login form: the /admin proxy
              bounces signed-out visitors to /login and lets signed-in officers
              straight through, so one link is correct in both cases. */}
          <Link href="/admin" className={NAV_BUTTON}>
            Officer sign in
          </Link>
        </span>
      </nav>
    </header>
  )
}
