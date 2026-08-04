# Top-12-website

A web app / point system for the amazing top 12 team!

Built with [Next.js](https://nextjs.org) (App Router), React 19, Tailwind CSS v4,
and Supabase.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev            # dev server at localhost:3000
npm run build          # production build
npm run lint           # ESLint
npm run test:calendar  # verify the Google Calendar bridge end-to-end
npx tsc --noEmit       # type-check without building
```

## Environment

Local secrets live in `.env.local` (git-ignored). The same values must be set in
the Vercel project settings for Production, Preview, and Development.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key for reads that bypass RLS |
| `GOOGLE_CREDENTIALS_B64` | Base64 of the entire service-account JSON |
| `GOOGLE_CALENDAR_ID` | The `@group.calendar.google.com` chapter calendar |

### Google Calendar bridge

Creating an event mirrors it onto the shared chapter calendar. The service
account credential is stored as **base64 of the whole JSON key file** rather than
as separate email/key variables:

```bash
base64 -w0 ~/Downloads/<project>-<keyid>.json
```

That is deliberate. Storing the PEM in its own env var means the newlines get
escaped to literal `\n`, and Node's OpenSSL then rejects the key with
`error:1E08010C:DECODER routines::unsupported`. Base64-encoding the whole file
lets `JSON.parse` restore real newlines for free, with no `.replace()` shim to
get wrong across environments.

The calendar must be shared with the bot's `client_email` (printed by
`npm run test:calendar`) with **"Make changes to events"** permission.

A calendar failure never blocks event creation — the check-in code is still
issued and saved, and the officer sees a warning banner explaining what failed.
