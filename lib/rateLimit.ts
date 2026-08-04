/**
 * Minimal fixed-window rate limiter, in process memory.
 *
 * The check-in endpoint hands out a yes/no on a 6-letter code. Unthrottled,
 * that is 26^6 guesses away from a valid code and a brute-forcer would find one
 * in an afternoon. This makes that expensive without adding infrastructure.
 *
 * KNOWN LIMITS — this is deliberately the cheap version:
 *
 *  - **Per-instance.** Serverless spreads requests across lambdas, each with
 *    its own Map, so the real ceiling is roughly `limit × instances`. It
 *    raises the cost of a brute-force attempt; it does not cap it.
 *  - **Resets on cold start.** A new instance starts with an empty Map.
 *  - **IP-keyed**, and the IP comes from `x-forwarded-for`, which is only
 *    trustworthy because Vercel overwrites it at the edge. Behind a different
 *    proxy it would be spoofable. A whole meeting room also shares one NAT'd
 *    IP, which is why the limit is set well above what one person needs.
 *
 * If check-in codes ever protect something that matters more than points,
 * replace this with Upstash Redis (`@upstash/ratelimit`) so the window is
 * shared across instances.
 */

type Window = { count: number; resetAt: number }

const buckets = new Map<string, Window>()

/** Bound the Map so a long-lived instance can't grow it without limit. */
const MAX_KEYS = 10_000

export type RateLimitResult = {
  ok: boolean
  /** Attempts left in the current window. */
  remaining: number
  /** Seconds until the window resets — used for the Retry-After header. */
  retryAfter: number
}

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || now >= existing.resetAt) {
    if (buckets.size >= MAX_KEYS) sweep(now)
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfter: 0 }
  }

  existing.count += 1
  const retryAfter = Math.ceil((existing.resetAt - now) / 1000)

  if (existing.count > limit) return { ok: false, remaining: 0, retryAfter }

  return { ok: true, remaining: limit - existing.count, retryAfter }
}

/**
 * Is this key already over its limit, without spending an attempt?
 *
 * Lets the caller gate on a budget it only charges for on failure — a room of
 * members checking in successfully shares one NAT'd IP and must not burn
 * through the brute-force allowance just by showing up.
 */
export function peekRateLimit(
  key: string,
  { limit }: { limit: number }
): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || now >= existing.resetAt) {
    return { ok: true, remaining: limit, retryAfter: 0 }
  }

  const retryAfter = Math.ceil((existing.resetAt - now) / 1000)
  return {
    ok: existing.count < limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfter,
  }
}

function sweep(now: number) {
  for (const [key, window] of buckets) {
    if (now >= window.resetAt) buckets.delete(key)
  }
  // Everything is still live — drop the oldest to stay bounded.
  if (buckets.size >= MAX_KEYS) {
    const oldest = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt)
    for (const [key] of oldest.slice(0, Math.ceil(MAX_KEYS / 4))) buckets.delete(key)
  }
}

/**
 * Best-effort client IP.
 *
 * `x-forwarded-for` is a comma-separated chain and the client is the first
 * entry. Falls back to a shared bucket so a request with no usable IP is still
 * throttled rather than exempt.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return headers.get('x-real-ip')?.trim() || 'unknown'
}
