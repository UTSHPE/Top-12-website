# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build
npm run lint     # run ESLint
npx tsc --noEmit # type-check without building

npm run test:sync                                  # exercises /api/members/sync — needs `npm run dev` running
node --env-file=.env.local scripts/test-calendar.mjs # Google Calendar auth/permission check, outside Next.js
```

There is no unit-test framework. The two scripts above hit **live** services
using `.env.local`: `test:sync` writes and then deletes roster rows with EIDs
`test0000`/`test0001`. The repo is public — never hardcode a secret in a script.

## Environment

`.env.local` (git-ignored), mirrored in Vercel. Besides the two `NEXT_PUBLIC_SUPABASE_*`
vars: `SUPABASE_SERVICE_ROLE_KEY`, `MEMBER_SYNC_SECRET` (shared secret for the
member-sync route; unset means the route refuses everything), and
`GOOGLE_CLIENT_EMAIL` / `GOOGLE_PRIVATE_KEY` / `GOOGLE_CALENDAR_ID` for the
calendar bridge. `lib/google/calendar.ts` reads those three — the README's
`GOOGLE_CREDENTIALS_B64` is not what the code uses. The private key is stored
with escaped `\n`s and restored in code.

## Stack

- **Next.js 16.2.6** (App Router) — this version has breaking changes vs. older Next.js. Always read `node_modules/next/dist/docs/` before writing Next.js-specific code.
- **React 19** with TypeScript (strict mode)
- **Tailwind CSS v4** — uses `@import "tailwindcss"` syntax, not the v3 `@tailwind` directives. Custom theme tokens go inside `@theme` blocks in `globals.css`.
- **Supabase** (`@supabase/supabase-js` + `@supabase/ssr`) — browser client lives at `lib/supabase/client.ts`. All env vars are `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## Architecture

All routes live under `app/` following Next.js App Router conventions. Pages are **Server Components by default** — add `'use client'` only when the component needs state, event handlers, or browser APIs.

```
app/
  page.tsx           # member landing
  login/             # officer email/password login (client component)
  admin/             # officer console — sidebar shell in admin/layout.tsx
    page.tsx         # dashboard: stat tiles + recent events with codes
    create-event/    # event creator + "code generated" signature moment
    events/          # attendance & engagement table; [id]/edit, [id]/sign-ins (raffle list)
    leaderboard/     # chapter board inside the console shell
    rtc/             # RTC attendance report for stipend paperwork
    gm/              # general meeting attendance, tabbed by number of GMs attended
  events/            # member event browse w/ category filter chips
  leaderboard/       # podium + ranked rows + "you" row
  checkin/           # public member check-in — /checkin and /checkin/[code]
  stats/             # member stats: EID lookup → points, rank, events attended
  actions/           # 'use server' — checkIn, create/update/deleteEvent, setCheckInOpen, setEventRtc
  api/checkin/       # POST route the check-in form submits to
  api/stats/         # POST { eid } → member stats (rate-limited, never sets the cookie)
  api/members/sync/  # Google Forms → roster upsert (Apps Script POSTs here, bearer secret)
components/          # shared UI (see Design system below)
lib/
  events.ts          # event queries + category → color mapping
  checkin.ts         # the check-in decision, shared by the action and the route
  rateLimit.ts       # in-memory per-IP limiter for the check-in endpoint
  leaderboard.ts     # sign-in aggregation and ranking
  memberStats.ts     # one member's totals + attended events, for /stats
  rtc.ts             # RTC headcount report — deliberately walled off from points
  gm.ts              # GM attendance + contact info, current term, numbered by date
  links.ts           # officer important_links (service-role only)
  calendar.ts        # member "Add to Google Calendar" URL — no API involved
  google/calendar.ts # officer-side Calendar API bridge (insert/patch/delete)
  accessCode*.ts     # code generation + the unambiguous code alphabet
  officer.ts         # signed-in officer, enriched from the members roster
  format.ts          # all date/points formatting (America/Chicago)
  memberSession.ts   # EID cookie name/TTL
  supabase/
    client.ts        # singleton cookie-backed browser client (createBrowserClient)
    server.ts        # cookie-aware server client for Server Components/actions
    admin.ts         # service-role client — server-only, bypasses RLS
    fetchAll.ts      # pages past PostgREST's silent 1000-row cap
    proxy.ts         # updateSession helper used by the proxy auth wall
proxy.ts             # auth guard for all /admin/* routes (Next 16 renamed from middleware.ts)
```

A `'use server'` file may only export async functions — shared constants used by
actions live elsewhere (that's why `EID_COOKIE` sits in `lib/memberSession.ts`).

## Database schema (Supabase)

See **`docs/SCHEMA.md`** for the verified current schema, including how it was
verified and what remains unconfirmed. Summary:

**`members`** — `id`, `created_at`, `first_name`, `last_name`, `email`, `eid` (unique), `major`, `position`, `Class`, `stipend_eligible`  
- `position` defaults to `'Member'` and is display-only — authorization is simply "has a Supabase Auth session" (only officers have accounts; see `proxy.ts`). The member-sync route never writes `position`, so a form resync can't demote anyone.  
- `Class` is case-sensitive (quoted identifier in Postgres)
- There is **no `DOB` column** — earlier versions of this file claimed one; it does not exist

**`events`** — `id`, `title`, `location`, `event_type`, `created_by_officer`, a 6-char `access_code`, `base_points`, `multiplier`, and a `recurrence_group_id` linking recurring series. Two separate time windows: `calendar_start`/`calendar_end` (when the event runs, shown to members) and `check_in_start`/`check_in_end` (when the code works). Plus `is_open` (officer kill switch), `deleted_at` (soft delete), `google_event_id` (its chapter-calendar entry), `secondary_event_type` (optional co-hosting committee), and `is_rtc`. Optional driver sign-in: `driver_access_code` + `driver_base_points` + `driver_multiplier` (all three or none, CHECK-enforced).

**`sign_ins`** — join table: `eid` → `event_id`, `role` (`'attendee'` | `'driver'`), records `points_earned` (= `base_points × multiplier`, or the driver pair for a driver row), and `deleted_at`. Unique on `(event_id, eid, role)`. Check-in is only valid while the current time falls within `check_in_start`/`check_in_end` — not the calendar window — **and** `is_open` is true.

**`important_links`** — officer resource links (`name`, `href`, `committee`, `purpose`, `sort_order`). RLS on with **no policy**, so only the service-role key reads it; that is the only thing keeping the URLs private. Seeded by hand, never in a migration. `COMMITTEES` in `lib/links.ts` must match the CHECK constraint in migration `010`.

Schema changes live in `docs/migrations/` as hand-run, idempotent SQL applied in
order in the Supabase SQL editor (no migration tooling; see its README). Every
numbered migration through `011` is required. **`001`, `003`, and `004` missing
makes the app render empty** — the query helpers return `data ?? []`, so a
missing column (`42703`) fails silently. Newer readers (`lib/rtc.ts`, `lib/links.ts`)
surface or log the error instead; prefer that for anything an officer acts on.

Any query that aggregates a whole table (above all `sign_ins`) must go through
`fetchAll` in `lib/supabase/fetchAll.ts` with a stable `.order()` — a plain
`.select()` stops at 1000 rows with no error.

## Design system

Implements the UT SHPE design handoff. All tokens are declared in `app/globals.css`
and consumed as ordinary Tailwind utilities — never hard-code a hex that has a token.

- **Color:** `primary` #BF5700, `primary-bright` #E57200 (CTAs), `secondary` #1F5FB8, `ink` #211C18, `bg` #F5F4F1, `success` #137A45, plus `gold`/`silver`/`bronze`.
- **Type:** `font-display` (Bricolage Grotesque) headings and numbers, `font-sans` (Hanken Grotesk) body, `font-mono` (IBM Plex Mono) **access codes only**. Loaded via `next/font/google` in `layout.tsx`.
- **Radius:** `rounded-sm` 9px (buttons/inputs), `-md` 12px, `-lg` 16px (cards), `-xl` 18px (shells). **Shadow:** `shadow-card`, `shadow-raised`, `shadow-cta`. Soft single-blur only — no gradients, no borders on cards.
- **Motion:** `animate-livepulse` (live dots), `animate-popcheck`, `animate-confburst`, `animate-caret`. Custom utilities `lift`, `rowlift`, `ncta` (nav bold-and-tint hover).
- Icons are Font Awesome 6 via `react-icons/fa6`.

The **access code** is the signature component: `CodeDisplay` renders it in the
officer's dashed-orange treatment, which means "a code to share". Keep that
treatment off anything a member types into. `PresentCodeButton` wraps it in the
fullscreen projector overlay (`size="xl"`) and is used both by the create-event
success card and by each row of the dashboard's event table.

Size the `xl` code with the `clamp()` values already on it, never a
`transform: scale()` — scaling leaves the layout box at its original size, so
the tiles collide with the label and hint around them.

`components/Avatar.tsx` renders monogram discs — the mockups' character
illustrations are placeholder art, so real people get the documented fallback.

## Key conventions

- Import the Supabase client from `@/lib/supabase/client` in any client component that touches the DB.
- Server-side reads use `createAdminClient()` (service role, bypasses RLS) and must stay in Server Components or actions — the browser only ever receives rendered values.
- The `@/*` alias maps to the repo root (set in `tsconfig.json`).
- Format dates and points through `lib/format.ts`, which pins the zone to `America/Chicago`. Calling `toLocaleDateString()` directly shifts evening events onto the wrong day when the server runs in UTC.
- Unique-constraint violations from Supabase return error code `'23505'`; surface a friendly message rather than the raw Postgres error.
- Members never log in. A successful check-in drops their EID in a cookie (`lib/memberSession.ts`); that is the only way the app knows who a visitor is, and it's what drives the leaderboard's "you" row.
- **Check-in decision logic lives in `lib/checkin.ts`**, not in the action or the route. `app/api/checkin/route.ts` (what the member form posts to) and `app/actions/checkIn.ts` (kept for the standalone QR-code script) are both thin wrappers over it, so they can't drift apart. Both set the EID cookie.
- Duplicate check-ins are caught by the **unique index on `(event_id, eid, role)`**, never by a SELECT-then-INSERT — two simultaneous submits would both pass that check. The route catches `23505` and reports it as success.
- **EID case never matters.** Input is lowercased, and the roster is matched with `ilike` because rows added by hand through the Supabase dashboard keep whatever casing was typed. The *roster's* spelling is then used for the `sign_ins` row, the cookie, and the rank lookup — so one person can't split into two leaderboard rows by capitalizing differently on a later check-in.
- Deleting an event is a **soft delete**: `deleted_at` is stamped on the event *and* every child `sign_ins` row. Stamping the children matters because `lib/leaderboard.ts` aggregates `sign_ins` alone and never joins `events`. Every read filters `.is('deleted_at', null)`.
- The member nav's officer button points at `/admin`, not `/login`: the proxy bounces signed-out visitors to the login form and lets signed-in officers straight through. On phones it is a text link in the header's top-right; the tab bar's fifth slot is Stats.
- **Stats lookup is open but throttled.** Any EID can be looked up on `/stats` (the leaderboard is already public), so `app/api/stats/route.ts` charges a per-IP miss budget for EIDs not on the roster. It never sets the EID cookie — looking someone up must not make you "them" on the leaderboard. Totals and rank come from `getLeaderboard()` so the two pages can't disagree.
- **Google Calendar sync is best-effort and always runs second.** Create/update/delete commit to Supabase first (it's the source of truth for check-in), then mirror to Google. A Google failure comes back as a `calendarWarning(s)` the officer sees and never rolls back the row. Only title, calendar window, and location are mirrored — the check-in window and `is_open` stay internal. `lib/google/calendar.ts` throws at import if its env vars are missing, so `updateEvent`/`deleteEvent` import it **dynamically** inside a try; keep that pattern. Recurring series are inserted in parallel, not sequentially, so a long series finishes inside the serverless time limit. On edit, `patchCalendarEvent` restores an entry deleted by hand, or recreates one Google has purged and repoints `google_event_id`.
- On edit, an event's committee, points, and **access code are immutable** (the code may already be printed). Past events can't be edited.
- **RTC is not points.** `lib/rtc.ts` counts `is_rtc` attendance for `stipend_eligible` members, for the VPE's stipend paperwork. It never reads `points_earned`, and the leaderboard never reads `is_rtc`/`stipend_eligible`. Keep them apart, and don't add an eligibility threshold — the VPE interprets the counts. It defaults to the current term (`termBounds` in `lib/format.ts`), not all-time. It counts `role = 'attendee'` rows only.
- **Driver sign-in** is a second code on the *same* event row, never a second event — so it never reaches Google Calendar and needs no listing filters. It shares the event's check-in window and `is_open`; `lib/checkin.ts` matches either column and sets `role` from which one hit (the code is validated against the code alphabet first because it is interpolated into a PostgREST `.or()`). Driver points stack with attendance. Headcounts, the raffle list, and RTC count attendees only. The driver code is officer-only: it is in `OFFICER_EVENT_COLUMNS`, never `EVENT_COLUMNS`, and `DriverCode` deliberately has no Present button. It can be added on create or later on edit, and is immutable once it exists.
