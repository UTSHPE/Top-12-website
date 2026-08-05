/**
 * The shape of an access code, in one place.
 *
 * Kept separate from `lib/accessCode.ts` because that module imports node's
 * `crypto` to generate codes, and the check-in form is a client component —
 * importing the generator there would pull `node:crypto` into the browser
 * bundle. Both sides import these constants instead, so the alphabet the
 * generator emits and the alphabet the input accepts cannot drift apart.
 *
 * They did drift once: the input filtered on /[^a-zA-Z]/ and silently ate the
 * digits out of codes like RT3ADR, making them impossible to type.
 */
export const CODE_ALPHABET = 'ABCDEFGHJKMNPQRTUVWXYZ23469'

export const CODE_LENGTH = 6

/** Matches any character that cannot appear in a code. */
export const NOT_CODE_CHAR = new RegExp(`[^${CODE_ALPHABET}]`, 'g')

/**
 * Uppercase first, then drop anything outside the alphabet — a lowercase "r"
 * has to become "R" before it is tested, or it would be discarded.
 */
export function keepCodeChars(raw: string): string {
  return raw.toUpperCase().replace(NOT_CODE_CHAR, '')
}
