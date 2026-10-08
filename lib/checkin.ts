import { createAdminClient } from '@/lib/supabase/admin'
import { getRankFor } from '@/lib/leaderboard'
import { CODE_ALPHABET, CODE_LENGTH } from '@/lib/accessCodeFormat'

export type CheckInError =
  | 'invalid_code'
  | 'window_closed'
  | 'member_not_found'
  | 'already_signed_in'

/**
 * Which of the event's two codes was used. A driver who also attends checks in
 * once with each and holds one sign_ins row per role.
 */
export type SignInRole = 'attendee' | 'driver'

export type CheckInSuccess = {
  success: true
  role: SignInRole
  points: number
  eventName: string
  /** Position on the board after this check-in, if it could be computed. */
  rank: number | null
  /** True when the row already existed — the UI treats this as success. */
  duplicate: boolean
  /**
   * The roster's spelling of the EID — what actually got stored. Callers set
   * the cookie to this so the leaderboard's "you" row matches.
   */
  eid: string
}

export type CheckInResult = CheckInSuccess | { success: false; error: CheckInError }

/** Postgres unique-violation. The duplicate guard depends on this. */
const UNIQUE_VIOLATION = '23505'

/**
 * Normalize what someone typed.
 *
 * Case never matters for an EID — "ABC1234" and "abc1234" are the same person.
 * Whitespace is stripped rather than trimmed, because people paste with a stray
 * space in the middle off a projector slide.
 *
 * This only normalizes the *input*. The roster is matched case-insensitively
 * too — see the lookup below.
 */
export function normalizeEid(raw: string): string {
  return raw.replace(/\s+/g, '').toLowerCase()
}

export function normalizeAccessCode(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase()
}

/**
 * Could this string be an EID at all?
 *
 * The roster is matched case-insensitively with `ilike`, and `%`, `_`, and `*`
 * are all wildcards there — an EID of `%` would match an arbitrary member and
 * check in the wrong person. Rather than reason about escaping across PostgREST
 * and SQL LIKE, anything outside `[a-z0-9]` is refused a lookup entirely.
 *
 * This is not a format check on length or shape: a real EID is alphanumeric, so
 * a string containing anything else could never match a roster row anyway. It
 * reports as "not on the roster" like any other miss — never as a format
 * complaint — so a member is never told their own EID looks wrong.
 */
const EID_SAFE = /^[a-z0-9]+$/

/**
 * Could this string be an access code at all?
 *
 * Load-bearing, not cosmetic: the event lookup below interpolates the code into
 * a PostgREST `.or()` filter, where `,` `(` `)` and `.` are syntax. Restricting
 * it to the code alphabet first means nothing typed can reshape that filter.
 */
const CODE_SAFE = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`)

/**
 * The whole check-in decision, in one place.
 *
 * Every caller runs this on the server with the service-role client: the anon
 * key is public, so letting a browser query `events` by code would let anyone
 * enumerate valid codes. Callers pass raw user input; normalization happens
 * here so no caller can forget it.
 *
 * Returns a plain object rather than throwing, because every failure here is a
 * message for a member standing in a meeting room, not an exception.
 */
export async function performCheckIn(input: {
  eid: string
  accessCode: string
}): Promise<CheckInResult> {
  const eid = normalizeEid(input.eid)
  const accessCode = normalizeAccessCode(input.accessCode)

  if (!eid || !accessCode) return { success: false, error: 'invalid_code' }
  if (!CODE_SAFE.test(accessCode)) return { success: false, error: 'invalid_code' }

  const supabase = createAdminClient()

  // Step 1 — find the event by code, matching either the attendee code or the
  // driver code. A soft-deleted event is gone as far as check-in is concerned,
  // so it reads as an invalid code rather than leaking that it once existed.
  //
  // limit(2), not maybeSingle(): each column is unique on its own, but nothing
  // stops one event's attendee code equalling another's driver code. That is
  // astronomically unlikely, and if it ever happens the right move is to refuse
  // loudly rather than award points on whichever row Postgres returned first.
  const { data: matches, error: lookupError } = await supabase
    .from('events')
    .select(
      'id, title, check_in_start, check_in_end, base_points, multiplier, is_open, access_code, driver_access_code, driver_base_points, driver_multiplier'
    )
    .or(`access_code.eq.${accessCode},driver_access_code.eq.${accessCode}`)
    .is('deleted_at', null)
    .limit(2)

  // A failed query is not a wrong code. Telling a member to "double-check the
  // slide" when the real problem is a bad service-role key or a missing column
  // sends them hunting for a mistake they didn't make, and hides the outage —
  // so this throws and surfaces as a server error instead.
  if (lookupError) throw new Error(`event lookup failed: ${lookupError.message}`)

  if (matches && matches.length > 1) {
    throw new Error(`access code ${accessCode} matches more than one event`)
  }
  const event = matches?.[0]
  if (!event) return { success: false, error: 'invalid_code' }

  // The driver code shares the event's window and is_open below — only the
  // points and the role differ.
  const role: SignInRole =
    event.access_code === accessCode ? 'attendee' : 'driver'

  // Step 2 — the window, plus the officer's manual switch. `is_open` can only
  // close check-in early; it never extends past check_in_end.
  const now = new Date()
  const withinWindow =
    now >= new Date(event.check_in_start) && now <= new Date(event.check_in_end)

  if (!withinWindow || event.is_open === false) {
    return { success: false, error: 'window_closed' }
  }

  // Step 3 — the EID has to be on the roster. Unrecognized EIDs are rejected
  // rather than auto-creating a member, so the roster stays something an
  // officer curated rather than something the check-in form filled in.
  //
  // Matched with ilike, not eq: normalizing the input to lowercase only helps
  // if the roster is lowercase too, and it may not be — rows added by hand
  // through the Supabase dashboard keep whatever casing was typed. An exact
  // match would lock those members out of check-in entirely.
  if (!EID_SAFE.test(eid)) return { success: false, error: 'member_not_found' }

  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('eid')
    .ilike('eid', eid)
    .order('eid', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (memberError) throw new Error(`member lookup failed: ${memberError.message}`)
  if (!member) return { success: false, error: 'member_not_found' }

  // Everything downstream uses the roster's spelling of the EID, not the
  // visitor's. That keeps the sign_ins row joinable against `members` on the
  // leaderboard, and means one person can't earn two board rows by typing
  // their EID in a different case on a later check-in.
  const canonicalEid = member.eid

  // Step 4 — insert, and let the database settle duplicates.
  //
  // Deliberately NOT a SELECT-then-INSERT: two people submitting at the same
  // instant would both see "no existing row" and both insert. The unique index
  // on (event_id, eid, role) from migration 011 is what actually prevents
  // that; a 23505 back from it means they were already checked in as this role.
  const points_earned =
    role === 'driver'
      ? Number(event.driver_base_points) * Number(event.driver_multiplier)
      : Number(event.base_points) * Number(event.multiplier)

  const { error: insertError } = await supabase.from('sign_ins').insert({
    eid: canonicalEid,
    event_id: event.id,
    role,
    points_earned,
  })

  const duplicate = insertError?.code === UNIQUE_VIOLATION
  if (insertError && !duplicate) throw new Error(insertError.message)

  return {
    success: true,
    role,
    points: points_earned,
    eventName: event.title,
    rank: await getRankFor(canonicalEid),
    duplicate,
    eid: canonicalEid,
  }
}

/** Member-facing copy. Kept next to the errors so the two can't drift apart. */
export function checkInErrorMessage(error: CheckInError): string {
  switch (error) {
    case 'invalid_code':
      return "That code isn't valid — double-check the slide."
    case 'window_closed':
      return 'Check-in for this event has closed.'
    case 'member_not_found':
      return "That EID isn't on the roster yet. Grab an officer and they'll add you."
    case 'already_signed_in':
      return "You're already checked in!"
  }
}
