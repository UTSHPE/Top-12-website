import type { PostgrestError } from '@supabase/supabase-js'

/** PostgREST's default `max-rows`. A request asking for more is silently cut here. */
const PAGE_SIZE = 1000

/**
 * Read every row a query matches, a page at a time.
 *
 * A plain `.select()` stops at 1000 rows with no error and no hint that it
 * stopped — the counts built from it just quietly come up short. Anything that
 * aggregates a whole table (sign_ins, above all) has to page.
 *
 * `page` builds the query for one slice and must apply `.range(from, to)` to a
 * query with a stable `.order()`; without an order, rows can repeat or vanish
 * between pages.
 */
export async function fetchAll<T>(
  page: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>
): Promise<{ data: T[]; error: PostgrestError | null }> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) return { data: rows, error }
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return { data: rows, error: null }
  }
}
