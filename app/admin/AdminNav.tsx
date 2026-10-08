'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FaCalendarDay,
  FaGauge,
  FaHouse,
  FaPlus,
  FaRankingStar,
  FaRoad,
  FaUsers,
} from 'react-icons/fa6'
import type { IconType } from 'react-icons'

/** `short` is the bottom-tab label — six of them have to fit a 320px phone. */
const ITEMS: { href: string; label: string; short: string; Icon: IconType }[] = [
  { href: '/admin', label: 'Dashboard', short: 'Home', Icon: FaGauge },
  { href: '/admin/events', label: 'Events', short: 'Events', Icon: FaCalendarDay },
  { href: '/admin/create-event', label: 'Create Event', short: 'Create', Icon: FaPlus },
  { href: '/admin/leaderboard', label: 'Leaderboard', short: 'Board', Icon: FaRankingStar },
  { href: '/admin/rtc', label: 'RTC', short: 'RTC', Icon: FaRoad },
  { href: '/admin/gm', label: 'GM Attendance', short: 'GMs', Icon: FaUsers },
]

const ITEM_BASE =
  'flex flex-none items-center gap-[11px] rounded-sm px-3 py-[11px] transition-colors'

/**
 * Prefix match, so an event's edit and raffle pages still light up "Events".
 * The dashboard is exact — every console path starts with /admin.
 */
function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <>
      {/* Desktop: the sidebar list. */}
      <div className="hidden md:flex md:flex-col">
        <nav aria-label="Console" className="flex flex-col gap-1 text-sm font-semibold">
          {ITEMS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`${ITEM_BASE} ${
                  active
                    ? 'bg-primary-bright/16 text-[#F0A365]'
                    : 'text-[#C7BCAE] hover:text-white'
                }`}
              >
                <Icon aria-hidden className="size-[18px] flex-none" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Leaving the console, so it sits apart from the section nav. */}
        <Link
          href="/"
          className={`${ITEM_BASE} mt-3 border-t border-white/12 pt-4 text-sm font-medium text-[#A99E8F] hover:text-white`}
        >
          <FaHouse aria-hidden className="size-[18px] flex-none" />
          Member site
        </Link>
      </div>

      {/* Phone: "Member site" stays in the top bar, as an icon. */}
      <div className="flex justify-end md:hidden">
        <Link
          href="/"
          aria-label="Member site"
          title="Member site"
          className="flex size-10 items-center justify-center rounded-sm text-[#A99E8F] transition-colors hover:text-white"
        >
          <FaHouse aria-hidden className="size-[18px]" />
        </Link>
      </div>

      {/* Phone: the section links as a bottom tab bar, where a thumb reaches.
          The top strip this replaces only had room for one link — the rest
          sat off-screen in a sideways scroll. */}
      <nav
        aria-label="Console"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 border-t border-white/10 bg-ink pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {ITEMS.map(({ href, label, short, Icon }) => {
          const active = isActive(pathname, href)
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={active ? 'page' : undefined}
              className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                active ? 'text-[#F0A365]' : 'text-[#A99E8F] hover:text-white'
              }`}
            >
              <Icon aria-hidden className="size-5" />
              {short}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
