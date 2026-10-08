'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaUserShield } from 'react-icons/fa6'
import Logo from '@/components/Logo'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/events', label: 'Events' },
  { href: '/leaderboard', label: 'Leaderboard' },
  { href: '/stats', label: 'Stats' },
]

/** One pill shape for the center links and the Check in button, so they match. */
const PILL =
  'rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors'
const PILL_ACTIVE = 'bg-primary-bright text-white shadow-cta'

/** Prefix match, so nested routes still light up their section. Home is exact. */
function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/**
 * The member header. Under `md` it is the logo plus a quiet Officer sign in
 * link, and every member link lives in MemberTabBar at the bottom of the
 * screen. From `md` up it is a three-column grid — logo, the page links in a
 * centered pill, then Officer sign in and the Check in CTA — so the pill sits
 * at the true center no matter how wide the two sides are.
 */
export default function MemberNav() {
  const pathname = usePathname()

  return (
    <header className="flex h-[62px] flex-none items-center justify-between gap-4 border-b border-hairline bg-surface px-5 sm:px-[30px] md:grid md:grid-cols-[1fr_auto_1fr]">
      {/* Two sizes, and the display utility has to sit on a wrapper rather than
          on Logo itself. Logo hard-codes `inline-flex` on its own root, and
          Tailwind emits `.hidden` *before* `.inline-flex` in the utilities
          layer — same specificity, so the component's class won and the phone
          rendered both lockups side by side. On separate elements there is no
          conflict to lose. */}
      <Link href="/" aria-label="UT SHPE home" className="flex-none justify-self-start">
        <span className="sm:hidden">
          <Logo height={24} />
        </span>
        <span className="hidden sm:block">
          <Logo height={30} />
        </span>
      </Link>

      <nav
        aria-label="Site"
        className="hidden items-center gap-1 rounded-full bg-bg p-1 md:flex"
      >
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={`${PILL} ${active ? PILL_ACTIVE : 'text-body hover:text-primary'}`}
            >
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="flex items-center gap-2 justify-self-end">
        {/* Officers only, so it's a white pill rather than a second orange one
            competing with Check in. Points at the console, not
            the login form: the /admin proxy bounces signed-out visitors to
            /login and lets signed-in officers straight through. */}
        <span className="flex rounded-full bg-bg p-1">
          <Link
            href="/admin"
            aria-label="Officer sign in (TOP12)"
            className={`${PILL} flex items-center gap-1.5 bg-surface text-ink shadow-card hover:text-primary`}
          >
            <FaUserShield aria-hidden className="size-3.5" />
            TOP12
          </Link>
        </span>

        {/* Phone has Check in in the tab bar, so the button is desktop only.
            Same pill-in-a-track shape as the center links. */}
        <span className="hidden rounded-full bg-bg p-1 md:flex">
          <Link
            href="/checkin"
            aria-current={isActive(pathname, '/checkin') ? 'page' : undefined}
            className={`${PILL} ${PILL_ACTIVE} tracking-[.04em] hover:bg-primary-hover`}
          >
            CHECK IN
          </Link>
        </span>
      </div>
    </header>
  )
}
