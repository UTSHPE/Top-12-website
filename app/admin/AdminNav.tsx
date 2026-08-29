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
} from 'react-icons/fa6'
import type { IconType } from 'react-icons'

const ITEMS: { href: string; label: string; Icon: IconType }[] = [
  { href: '/admin', label: 'Dashboard', Icon: FaGauge },
  { href: '/admin/events', label: 'Events', Icon: FaCalendarDay },
  { href: '/admin/create-event', label: 'Create Event', Icon: FaPlus },
  { href: '/admin/leaderboard', label: 'Leaderboard', Icon: FaRankingStar },
  { href: '/admin/rtc', label: 'RTC', Icon: FaRoad },
]

const ITEM_BASE =
  'flex flex-none items-center gap-[11px] rounded-sm px-3 py-[11px] transition-colors'

export default function AdminNav() {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
      <nav className="flex gap-1 text-sm font-semibold md:flex-col">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href
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
        className={`${ITEM_BASE} border-white/12 text-sm font-medium text-[#A99E8F] hover:text-white md:mt-3 md:border-t md:pt-4`}
      >
        <FaHouse aria-hidden className="size-[18px] flex-none" />
        Member site
      </Link>
    </div>
  )
}
