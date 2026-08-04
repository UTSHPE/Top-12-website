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
  checkin/           # public member check-in — /checkin and /checkin/[code]
  actions/           # 'use server' — checkIn, createEvent, deleteEvent, setCheckInOpen
  api/checkin/       # POST route the check-in form submits to
components/          # shared UI (see Design system below)
lib/
  events.ts          # event queries + category → color mapping
  checkin.ts         # the check-in decision, shared by the action and the route
  rateLimit.ts       # in-memory per-IP limiter for the check-in endpoint
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

See **`docs/SCHEMA.md`** for the verified current schema, including how it was
verified and what remains unconfirmed. Summary:

**`members`** — `id`, `created_at`, `first_name`, `last_name`, `email`, `eid` (unique), `major`, `position`, `Class`  
- `position` defaults to `'Member'`; officers have elevated values checked by middleware  
- `Class` is case-sensitive (quoted identifier in Postgres)
- There is **no `DOB` column** — earlier versions of this file claimed one; it does not exist

**`events`** — `id`, `title`, `location`, `event_type`, `created_by_officer`, a 6-char `access_code`, `base_points`, `multiplier`, and a `recurrence_group_id` linking recurring series. Two separate time windows: `calendar_start`/`calendar_end` (when the event runs, shown to members) and `check_in_start`/`check_in_end` (when the code works). Plus `is_open` (officer kill switch) and `deleted_at` (soft delete).

**`sign_ins`** — join table: `eid` → `event_id`, records `points_earned` (= `base_points × multiplier`), and `deleted_at`. Unique on `(event_id, eid)`. Check-in is only valid while the current time falls within `check_in_start`/`check_in_end` — not the calendar window — **and** `is_open` is true.

Schema changes live in `docs/migrations/` as hand-run SQL (there is no migration
tooling). **`001`, `003`, and `004` must be applied or the app renders empty** —
the query helpers return `data ?? []`, so a missing column fails silently.

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
- Duplicate check-ins are caught by the **unique index on `(event_id, eid)`**, never by a SELECT-then-INSERT — two simultaneous submits would both pass that check. The route catches `23505` and reports it as success.
- **EID case never matters.** Input is lowercased, and the roster is matched with `ilike` because rows added by hand through the Supabase dashboard keep whatever casing was typed. The *roster's* spelling is then used for the `sign_ins` row, the cookie, and the rank lookup — so one person can't split into two leaderboard rows by capitalizing differently on a later check-in.
- Deleting an event is a **soft delete**: `deleted_at` is stamped on the event *and* every child `sign_ins` row. Stamping the children matters because `lib/leaderboard.ts` aggregates `sign_ins` alone and never joins `events`. Every read filters `.is('deleted_at', null)`.
- The member nav's officer button points at `/admin`, not `/login`: the proxy bounces signed-out visitors to the login form and lets signed-in officers straight through.
