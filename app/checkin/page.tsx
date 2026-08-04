import type { Metadata } from 'next'
import MemberNav from '@/components/MemberNav'
import CheckInForm from '@/components/CheckInForm'
import CheckInHeader from './CheckInHeader'

export const metadata: Metadata = {
  title: 'Check in · UT SHPE Top 12',
  description: 'Enter the code on the slide to check in and earn your points.',
}

// The open-event banner has to reflect the room right now, never a cached
// render from an earlier meeting.
export const revalidate = 0

export default async function CheckInPage() {
  return (
    <>
      <MemberNav />
      <main className="flex-1 px-5 py-8 sm:px-[30px] sm:py-10">
        <div className="mx-auto max-w-[440px]">
          <CheckInHeader />
          <CheckInForm />
        </div>
      </main>
    </>
  )
}
