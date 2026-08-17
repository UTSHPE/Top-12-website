import { NextResponse, type NextRequest } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

// Service-role client plus node:crypto — neither runs on the edge runtime.
export const runtime = 'nodejs'

/**
 * Member sync endpoint for the membership Google Form.
 *
 * A Google Apps Script `onFormSubmit` trigger POSTs one submission here and we
 * upsert it onto the roster. The route is publicly reachable and writes to
 * `members`, so every request must carry the shared secret.
 *
 * The form is the source of truth for contact details only — `position` is
 * assigned by officers inside the app and is deliberately absent from the
 * payload we build, so a resync can never demote someone.
 */

type Body = Record<string, unknown>

/** What the Apps Script can distinguish in its own retry logic. */
type ErrorCode =
  | 'invalid_json'
  | 'missing_field'
  | 'invalid_email'
  | 'unauthorized'
  | 'server_misconfigured'
  | 'email_conflict'
  | 'server_error'

export async function POST(request: NextRequest) {
  const secret = process.env.MEMBER_SYNC_SECRET
  if (!secret) {
    // Fail closed. An unset secret must never degrade into an open endpoint.
    console.error('[members/sync] MEMBER_SYNC_SECRET is not set — refusing all requests')
    return fail(500, 'server_misconfigured', 'Sync is not configured on the server.')
  }

  if (!isAuthorized(request.headers.get('authorization'), secret)) {
    return fail(401, 'unauthorized', 'Invalid or missing sync secret.')
  }

  let body: Body
  try {
    body = await request.json()
  } catch {
    return fail(400, 'invalid_json', 'Request body was not valid JSON.')
  }

  // --- Required fields -----------------------------------------------------
  // The form marks all three required, so a submission missing one means the
  // form or the Apps Script changed shape. Fail loudly rather than importing a
  // half-record that someone has to find and repair later.
  const eid = text(body.eid).toLowerCase()
  const fullName = collapseWhitespace(text(body.full_name))
  const email = text(body.email).toLowerCase()

  for (const [field, value] of [
    ['eid', eid],
    ['full_name', fullName],
    ['email', email],
  ] as const) {
    if (!value) return fail(400, 'missing_field', `Missing required field: ${field}.`)
  }

  if (!looksLikeEmail(email)) {
    return fail(400, 'invalid_email', 'Field "email" is not a valid email address.')
  }

  const [firstName, ...restOfName] = fullName.split(' ')
  const lastName = restOfName.join(' ')

  const payload = {
    eid,
    email,
    full_name_raw: fullName,
    first_name: firstName,
    // A mononym is a real submission — accept it and leave the surname empty
    // rather than storing "" and having it render as a stray space.
    last_name: lastName || null,
    phone: nullable(body.phone),
    major: nullable(body.major),
    // The roster column is the quoted, capitalised `Class`.
    Class: nullable(body.class),
    shirt_size: nullable(body.shirt_size),
    // Month and day only. The year is dropped here and never stored.
    birth_month_day: monthDay(text(body.date_of_birth)),
    synced_at: new Date().toISOString(),
    // `position` is intentionally absent. See the note at the top of the file.
  }

  const supabase = createAdminClient()

  // Upsert alone can't say which happened, and the Apps Script's log is the
  // only place anyone watches this from. A racing insert between this read and
  // the write would only mislabel the action, never lose the row.
  const { data: existing, error: lookupError } = await supabase
    .from('members')
    .select('eid')
    .eq('eid', eid)
    .maybeSingle()

  if (lookupError) {
    console.error(`[members/sync] lookup failed for eid=${eid}:`, lookupError.message)
    return fail(500, 'server_error', 'Could not read the member roster.')
  }

  // Upsert, not insert: `eid` is unique, so an insert would fail on every
  // member who has already filled the form once.
  const { error } = await supabase.from('members').upsert(payload, { onConflict: 'eid' })

  if (error) {
    // `members` is unique on `email` as well as `eid`, and the upsert only
    // resolves conflicts on `eid`. A new EID reusing an existing address —
    // a typo, or a shared family inbox — lands here. The Apps Script needs to
    // tell that apart from a broken server, because only one of them is worth
    // retrying.
    if (error.code === '23505' && isEmailConflict(error)) {
      console.warn(`[members/sync] email already belongs to another member; eid=${eid}`)
      return fail(
        409,
        'email_conflict',
        'That email address is already registered to a different member. A human needs to resolve which record is correct.'
      )
    }

    // Log the code and message but never the record — these rows are student
    // names, emails, and phone numbers, and this lands in Vercel's retained
    // logs. The EID alone is enough to find the submission.
    console.error(`[members/sync] upsert failed for eid=${eid}: ${error.code} ${error.message}`)
    return fail(500, 'server_error', 'Could not save the member.')
  }

  return NextResponse.json({
    ok: true,
    action: existing ? 'updated' : 'inserted',
    eid,
  })
}

/**
 * Constant-time comparison of the `Authorization: Bearer <secret>` header.
 *
 * `timingSafeEqual` throws when the two buffers differ in length, which would
 * leak the secret's length through the difference between a 401 and a 500 —
 * so the length check happens first and returns the same plain `false`.
 */
function isAuthorized(header: string | null, secret: string): boolean {
  const match = /^Bearer (.+)$/.exec(header?.trim() ?? '')
  if (!match) return false

  const presented = Buffer.from(match[1], 'utf8')
  const expected = Buffer.from(secret, 'utf8')
  if (presented.length !== expected.length) return false

  return timingSafeEqual(presented, expected)
}

/** Deliberately loose: something, an `@`, something. Nothing stricter. */
function looksLikeEmail(value: string): boolean {
  const at = value.indexOf('@')
  return at > 0 && at === value.lastIndexOf('@') && at < value.length - 1
}

/**
 * `MM-DD`, year discarded. Accepts the `M/D/YYYY` a Google Form date field
 * produces and plain ISO `YYYY-MM-DD`. Anything else stores null — a birthday
 * we can't parse is worth losing, a whole membership record is not.
 */
function monthDay(value: string): string | null {
  const slash = /^(\d{1,2})\/(\d{1,2})\/\d{2,4}$/.exec(value)
  if (slash) return pad(slash[1], slash[2])

  const iso = /^\d{4}-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(value)
  if (iso) return pad(iso[1], iso[2])

  return null
}

function pad(month: string, day: string): string | null {
  const m = Number(month)
  const d = Number(day)
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  return `${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** Postgres reports the offending index in one of several fields. */
function isEmailConflict(error: { message?: string; details?: string | null }): boolean {
  return /email/i.test(`${error.message ?? ''} ${error.details ?? ''}`)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Every optional field is blank-or-absent → null, never `""`. */
function nullable(value: unknown): string | null {
  return text(value) || null
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ')
}

function fail(status: number, error: ErrorCode, message: string) {
  return NextResponse.json({ ok: false, error, message }, { status })
}
