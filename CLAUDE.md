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
  login/             # Week 4 – officer email/password login (client component)
  admin/
    create-event/    # Week 1 – officer event creator (client component)
    events/          # Week 3 – officer analytics dashboard
  checkin/           # Week 2 – mobile check-in portal
  leaderboard/       # Week 2 – points leaderboard
  api/
    gcal/            # Week 3 – Google Calendar integration route
lib/
  supabase/
    client.ts        # singleton cookie-backed browser client (createBrowserClient)
    server.ts        # cookie-aware server client for Server Components/actions
    proxy.ts         # updateSession helper used by the proxy auth wall
proxy.ts             # Week 4 – auth guard for all /admin/* routes (Next 16 renamed from middleware.ts)
```

## Database schema (Supabase)

**`members`** — `id`, `created_at`, `first_name`, `last_name`, `email`, `eid` (unique), `major`, `position`, `Class`, `DOB`  
- `position` defaults to `'Member'`; officers have elevated values checked by middleware  
- Column names `Class` and `DOB` are case-sensitive (quoted identifiers in Postgres)

**`events`** — stores individual event records with `calendar_start`, `calendar_end`, a 6-char `access_code`, `base_score`, `score_multiplier`, and a `recurrence_group_id` linking recurring series

**`sign_ins`** — join table: `eid` → `event_id`, records `points_earned` (= `base_score × score_multiplier`). Check-in is only valid while the current time falls within `calendar_start`/`calendar_end`.

## Key conventions

- Import the Supabase client from `@/lib/supabase/client` in any client component that touches the DB.
- The `@/*` alias maps to the repo root (set in `tsconfig.json`).
- Unique-constraint violations from Supabase return error code `'23505'`; surface a friendly message rather than the raw Postgres error.
