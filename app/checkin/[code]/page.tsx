import type { Metadata } from 'next'
import MemberNav from '@/components/MemberNav'
import CheckInForm from '@/components/CheckInForm'
import CheckInHeader from '../CheckInHeader'

export const metadata: Metadata = {
  title: 'Check in · UT SHPE Top 12',
  description: 'Enter the code on the slide to check in and earn your points.',
}

export const revalidate = 0

/**
 * The QR-code entry point: /checkin/VZMWBK prefills the code boxes so someone
 * scanning the slide only has to type their EID.
 *
 * The code in the URL is a convenience, nothing more. It is never validated
 * here — whatever lands in the boxes still goes to /api/checkin and is checked
 * there against the service-role client. A made-up code in the URL just
 * prefills six letters that will be rejected on submit.
 */
export default async function CheckInWithCodePage({
  params,
}: PageProps<'/checkin/[code]'>) {
  const { code } = await params

  return (
    <>
      <MemberNav />
      <main className="flex-1 px-5 py-8 sm:px-[30px] sm:py-10">
        <div className="mx-auto max-w-[440px]">
          <CheckInHeader />
          <CheckInForm initialCode={decodeURIComponent(code)} />
        </div>
      </main>
    </>
  )
}
