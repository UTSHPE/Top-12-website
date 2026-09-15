-- 009 — officer "Important links" panel, moved out of the repo.
--
-- These links (budget sheets, procard scheduling, the Flickr account, the
-- membership tracker) were a hardcoded array in components/ImportantLinks.tsx.
-- That put every URL in a public GitHub repo. They live here instead, so the
-- repo carries the shape of the data and never the destinations.
--
-- ⚠️ THE RLS BLOCK AT THE BOTTOM IS THE WHOLE POINT OF THIS MIGRATION.
-- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ships inside the browser bundle — it is
-- public in exactly the same way the repo is. Creating this table without RLS
-- would move the links from "readable on GitHub" to "readable by anyone who
-- opens devtools", which is not an improvement. RLS is enabled with NO policy,
-- so the anon key reads zero rows and only `createAdminClient()` (service-role,
-- server-only) can see them.
--
-- No `deleted_at` here, unlike `events`/`sign_ins`. Soft delete exists on those
-- so a removed event stops counting toward points already awarded. A retired
-- link has no history to preserve — delete the row.
--
-- Safe to re-run.

create table if not exists public.important_links (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null,
  href       text not null,
  committee  text not null,
  -- Nullable, not ''. The panel renders a shorter row when there is no purpose,
  -- and '' would be indistinguishable from "nobody wrote one yet".
  purpose    text,
  -- Explicit display order. The panel groups by committee (Treasurer first),
  -- which is not alphabetical and not insertion order, so it has to be stored.
  sort_order integer not null default 0
);

-- Mirrors the `Committee` union in lib/links.ts. If you add a committee here,
-- add it there too — the union is what picks the row's dot color, and a value
-- this constraint allows but the app doesn't know falls back to a neutral dot.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'important_links_committee_check'
  ) then
    alter table public.important_links
      add constraint important_links_committee_check
      check (committee in ('Treasurer', 'VPI', 'Secretary', 'Chapter Development'));
  end if;
end $$;

create index if not exists important_links_sort_order_idx
  on public.important_links (sort_order);

comment on table public.important_links is
  'Officer-only resource links rendered by the /admin dashboard. Kept out of '
  'the Git repo because the URLs are semi-private. RLS is enabled with no '
  'policy: only the service-role key can read this table.';

-- The security boundary. Enabled with no policies at all — that is deliberate,
-- not an unfinished step. Do NOT add a `for select using (true)` policy here.
alter table public.important_links enable row level security;

-- Verify after running (should return true, and 0 policies):
--
--   select relrowsecurity from pg_class where relname = 'important_links';
--   select count(*) from pg_policies where tablename = 'important_links';
