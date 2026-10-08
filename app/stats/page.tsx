import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { EID_COOKIE } from '@/lib/memberSession'
import { getMemberStats } from '@/lib/memberStats'
import MemberNav from '@/components/MemberNav'
import MemberTabBar from '@/components/MemberTabBar'
import MemberStats from '@/components/MemberStats'

export const metadata: Metadata = {
  title: 'My stats · UT SHPE Top 12',
  description: 'Look up your points, rank, and the events you have attended.',
}

// Points change with every check-in; never serve a cached render.
export const revalidate = 0

export default async function StatsPage() {
  // A member who has checked in on this device lands straight on their stats.
  const myEid = (await cookies()).get(EID_COOKIE)?.value
  let initialStats = null
  if (myEid) {
    try {
      initialStats = await getMemberStats(myEid)
    } catch (err) {
      // Fall back to the lookup form; never log the EID.
      console.error('[stats] prefill failed:', err instanceof Error ? err.message : err)
    }
  }

  return (
    <>
      <MemberNav />
      <main className="flex-1 px-5 py-8 sm:px-[30px] sm:py-10">
        <div className="mx-auto max-w-[520px]">
          <header className="mb-6">
            <h1 className="font-display text-[28px] leading-tight font-extrabold tracking-[-.6px] sm:text-[32px]">
              My stats
            </h1>
            <p className="mt-1.5 text-[15px] text-body">
              Enter your EID to see your points and every event you&apos;ve checked in to.
            </p>
          </header>
          <MemberStats initialStats={initialStats} />
        </div>
      </main>
      <MemberTabBar />
    </>
  )
}
