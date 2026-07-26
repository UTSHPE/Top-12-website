# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build
npm run lint     # run ESLint
npx tsc --noEmit # type-check without building
```

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
    events/          # attendance & engagement table
    leaderboard/     # chapter board inside the console shell
  events/            # member event browse w/ category filter chips
  leaderboard/       # podium + ranked rows + "you" row
  actions/           # 'use server' — checkIn, createEvent
  api/gcal/          # Google Calendar integration route
components/          # shared UI (see Design system below)
lib/
  events.ts          # event queries + category → color mapping
  leaderboard.ts     # sign-in aggregation and ranking
  officer.ts         # signed-in officer, enriched from the members roster
  format.ts          # all date/points formatting (America/Chicago)
  memberSession.ts   # EID cookie name/TTL
  supabase/
    client.ts        # singleton cookie-backed browser client (createBrowserClient)
    server.ts        # cookie-aware server client for Server Components/actions
    admin.ts         # service-role client — server-only, bypasses RLS
    proxy.ts         # updateSession helper used by the proxy auth wall
proxy.ts             # auth guard for all /admin/* routes (Next 16 renamed from middleware.ts)
```

A `'use server'` file may only export async functions — shared constants used by
actions live elsewhere (that's why `EID_COOKIE` sits in `lib/memberSession.ts`).

## Database schema (Supabase)

**`members`** — `id`, `created_at`, `first_name`, `last_name`, `email`, `eid` (unique), `major`, `position`, `Class`, `DOB`  
- `position` defaults to `'Member'`; officers have elevated values checked by middleware  
- Column names `Class` and `DOB` are case-sensitive (quoted identifiers in Postgres)

**`events`** — `id`, `title`, `location`, `event_type`, `created_by_officer`, a 6-char `access_code`, `base_points`, `multiplier`, and a `recurrence_group_id` linking recurring series. Two separate time windows: `calendar_start`/`calendar_end` (when the event runs, shown to members) and `check_in_start`/`check_in_end` (when the code works).

**`sign_ins`** — join table: `eid` → `event_id`, records `points_earned` (= `base_points × multiplier`). Check-in is only valid while the current time falls within `check_in_start`/`check_in_end` — not the calendar window.

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
- **Check-in has no page.** It is moving to a standalone QR-code script. `app/actions/checkIn.ts` holds the working logic (code lookup, window check, duplicate guard, points insert, rank) and is deliberately kept for that script to call — nothing imports it right now.
- The member nav's officer button points at `/admin`, not `/login`: the proxy bounces signed-out visitors to the login form and lets signed-in officers straight through.
