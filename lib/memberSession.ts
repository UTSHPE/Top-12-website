/**
 * There is no member login. A successful check-in is the only moment the app
 * learns who a visitor is, so it drops their EID in this cookie and the
 * leaderboard uses it to highlight their row on later visits.
 *
 * This lives outside the server-action file because a `'use server'` module may
 * only export async functions.
 */
export const EID_COOKIE = 'shpe_eid'

export const EID_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
