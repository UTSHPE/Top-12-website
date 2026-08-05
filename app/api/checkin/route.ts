import { NextResponse, type NextRequest } from 'next/server'
import {
  performCheckIn,
  checkInErrorMessage,
  type CheckInError,
} from '@/lib/checkin'
import { clientIp, peekRateLimit, rateLimit } from '@/lib/rateLimit'
import { EID_COOKIE, EID_COOKIE_MAX_AGE } from '@/lib/memberSession'

// The service-role Supabase client and the rate limiter's module-level Map both
// need a real Node runtime, not the edge one.
export const runtime = 'nodejs'

/**
 * Two budgets, because they defend against different things.
 *
 * REQUESTS is a blunt ceiling on traffic from one IP. It has to sit well above
 * what a real room needs: a whole meeting checks in from one NAT'd campus IP
 * within about a minute of the code going up on the slide.
 *
 * BAD_CODES is the one that actually stops code guessing, and it only charges
 * for attempts that named an event that doesn't exist. Members checking in
 * successfully never touch it, so it can be tight without punishing a crowd.
 */
const REQUESTS = { limit: 60, windowMs: 60_000 }
const BAD_CODES = { limit: 10, windowMs: 10 * 60_000 }

type Body = { eid?: unknown; code?: unknown }

export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers)

  const traffic = rateLimit(`checkin:req:${ip}`, REQUESTS)
  if (!traffic.ok) return tooMany(traffic.retryAfter)

  // Gate on the bad-code budget before doing any work, but don't spend from it
  // yet — only a wrong code below will.
  const guesses = peekRateLimit(`checkin:bad:${ip}`, BAD_CODES)
  if (!guesses.ok) return tooMany(guesses.retryAfter)

  let body: Body
  try {
    body = await request.json()
  } catch {
    return fail(400, 'invalid_request', 'Something went wrong. Try again.')
  }

  const rawEid = typeof body.eid === 'string' ? body.eid : ''
  const rawCode = typeof body.code === 'string' ? body.code : ''

  // Length caps only. UT EIDs are usually 3–8 alphanumerics, but the rule is
  // not worth enforcing here — rejecting a real student over a format guess is
  // worse than letting the roster lookup be the thing that says no.
  if (!rawEid.trim() || rawEid.length > 64) {
    return fail(400, 'invalid_request', 'Enter your UT EID.')
  }
  if (!rawCode.trim() || rawCode.length > 32) {
    return fail(400, 'invalid_request', 'Enter the 6-character code from the slide.')
  }

  let result
  try {
    result = await performCheckIn({ eid: rawEid, accessCode: rawCode })
  } catch (err) {
    // Never log the EID — these are student identifiers and this lands in
    // Vercel's retained logs.
    console.error('[checkin] failed:', err instanceof Error ? err.message : err)
    return fail(500, 'server_error', 'Something went wrong on our end. Try again.')
  }

  if (!result.success) {
    if (result.error === 'invalid_code') {
      rateLimit(`checkin:bad:${ip}`, BAD_CODES)
    }
    return fail(422, result.error, checkInErrorMessage(result.error))
  }

  // A duplicate is a success as far as the member is concerned — they are
  // checked in, which is all they wanted to know.
  const response = NextResponse.json({
    ok: true,
    duplicate: result.duplicate,
    eventName: result.eventName,
    points: result.points,
    rank: result.rank,
    message: result.duplicate
      ? checkInErrorMessage('already_signed_in')
      : `Checked in to ${result.eventName}`,
  })

  // This cookie is the only way the app ever learns who a visitor is — it is
  // what drives the "you" row on the leaderboard.
  response.cookies.set(EID_COOKIE, result.eid, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: EID_COOKIE_MAX_AGE,
  })

  return response
}

function fail(status: number, error: CheckInError | string, message: string) {
  return NextResponse.json({ ok: false, error, message }, { status })
}

function tooMany(retryAfter: number) {
  return NextResponse.json(
    {
      ok: false,
      error: 'rate_limited',
      message: 'Too many attempts. Wait a minute and try again.',
    },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )
}
