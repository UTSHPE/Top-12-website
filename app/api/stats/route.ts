import { NextResponse, type NextRequest } from 'next/server'
import { getMemberStats } from '@/lib/memberStats'
import { clientIp, peekRateLimit, rateLimit } from '@/lib/rateLimit'

// Service-role client and the rate limiter's Map need the Node runtime.
export const runtime = 'nodejs'

/**
 * Any EID can be looked up, so the budgets are what keep this from being a
 * roster-enumeration endpoint. MISSES only charges for EIDs that aren't on the
 * roster — a member checking their own stats never touches it.
 */
const REQUESTS = { limit: 30, windowMs: 60_000 }
const MISSES = { limit: 15, windowMs: 10 * 60_000 }

/**
 * Deliberately does not set the EID cookie: looking someone up must not make
 * you "them" on the leaderboard. Only a check-in does that.
 */
export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers)

  const traffic = rateLimit(`stats:req:${ip}`, REQUESTS)
  if (!traffic.ok) return tooMany(traffic.retryAfter)

  const misses = peekRateLimit(`stats:miss:${ip}`, MISSES)
  if (!misses.ok) return tooMany(misses.retryAfter)

  let body: { eid?: unknown }
  try {
    body = await request.json()
  } catch {
    return fail(400, 'Something went wrong. Try again.')
  }

  const rawEid = typeof body.eid === 'string' ? body.eid : ''
  if (!rawEid.trim() || rawEid.length > 64) return fail(400, 'Enter your UT EID.')

  let stats
  try {
    stats = await getMemberStats(rawEid)
  } catch (err) {
    // Never log the EID — it lands in Vercel's retained logs.
    console.error('[stats] failed:', err instanceof Error ? err.message : err)
    return fail(500, 'Something went wrong on our end. Try again.')
  }

  if (!stats) {
    rateLimit(`stats:miss:${ip}`, MISSES)
    return fail(404, "We couldn't find that EID on the roster. Double-check it and try again.")
  }

  return NextResponse.json({ ok: true, stats })
}

function fail(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status })
}

function tooMany(retryAfter: number) {
  return NextResponse.json(
    { ok: false, message: 'Too many lookups. Wait a minute and try again.' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  )
}
