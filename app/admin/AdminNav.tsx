'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  FaCalendarDay,
  FaEllipsis,
  FaGauge,
  FaHouse,
  FaPlus,
  FaRankingStar,
  FaRoad,
  FaUsers,
} from 'react-icons/fa6'
import type { IconType } from 'react-icons'

/**
 * `short` is the bottom-tab label — five tabs have to fit a 320px phone, so
 * items flagged `more` live behind the phone bar's More button instead. The
 * desktop sidebar lists everything.
 */
const ITEMS: { href: string; label: string; short: string; Icon: IconType; more?: true }[] = [
  { href: '/admin', label: 'Dashboard', short: 'Home', Icon: FaGauge },
  { href: '/admin/events', label: 'Events', short: 'Events', Icon: FaCalendarDay },
  { href: '/admin/create-event', label: 'Create Event', short: 'Create', Icon: FaPlus },
  { href: '/admin/leaderboard', label: 'Leaderboard', short: 'Board', Icon: FaRankingStar },
  { href: '/admin/rtc', label: 'RTC', short: 'RTC', Icon: FaRoad, more: true },
  { href: '/admin/gm', label: 'GM Attendance', short: 'GMs', Icon: FaUsers, more: true },
]

const TAB_ITEMS = ITEMS.filter((item) => !item.more)
const MORE_ITEMS = ITEMS.filter((item) => item.more)

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

  // The path the More menu was opened on. Comparing it to the current path
  // closes the menu on any navigation (link, back button) without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null)
  const moreOpen = openOn === pathname
  const onMorePage = MORE_ITEMS.some(({ href }) => isActive(pathname, href))

  useEffect(() => {
    if (!moreOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenOn(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moreOpen])

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
      {moreOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            tabIndex={-1}
            onClick={() => setOpenOn(null)}
            className="fixed inset-0 z-30 cursor-default md:hidden"
          />
          <nav
            id="console-more"
            aria-label="More console pages"
            className="fixed right-3 bottom-[calc(64px+env(safe-area-inset-bottom)+8px)] z-40 flex w-[min(220px,calc(100vw-24px))] flex-col gap-1 rounded-md border border-white/10 bg-ink p-1.5 text-sm font-semibold shadow-raised md:hidden"
          >
            {MORE_ITEMS.map(({ href, label, Icon }) => {
              const active = isActive(pathname, href)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setOpenOn(null)}
                  className={`${ITEM_BASE} min-h-12 ${
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
        </>
      )}

      <nav
        aria-label="Console"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-white/10 bg-ink pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {TAB_ITEMS.map(({ href, label, short, Icon }) => {
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

        {/* Lit while open, and while on a page that lives behind it, so an
            officer on RTC can still see where they are. */}
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-controls="console-more"
          onClick={() => setOpenOn(moreOpen ? null : pathname)}
          className={`flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
            moreOpen || onMorePage ? 'text-[#F0A365]' : 'text-[#A99E8F] hover:text-white'
          }`}
        >
          <FaEllipsis aria-hidden className="size-5" />
          More
        </button>
      </nav>
    </>
  )
}
