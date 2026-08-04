'use server'

import { cookies } from 'next/headers'
import { performCheckIn, type CheckInResult } from '@/lib/checkin'
import { EID_COOKIE, EID_COOKIE_MAX_AGE } from '@/lib/memberSession'

export type { CheckInError, CheckInResult } from '@/lib/checkin'

/**
 * Server-action entry point for check-in.
 *
 * The decision logic lives in `lib/checkin.ts` so this and the public route
 * handler at `app/api/checkin/route.ts` cannot drift apart — the member form
 * posts to the route, and this stays for the standalone QR-code script to call.
 * All this adds is the cookie, which a server action can set directly.
 */
export async function checkIn({
  eid,
  accessCode,
}: {
  eid: string
  accessCode: string
}): Promise<CheckInResult> {
  const result = await performCheckIn({ eid, accessCode })

  if (result.success) {
    // Remember who this is, so the leaderboard can show them their own rank.
    const cookieStore = await cookies()
    cookieStore.set(EID_COOKIE, result.eid, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: EID_COOKIE_MAX_AGE,
    })
  }

  return result
}
