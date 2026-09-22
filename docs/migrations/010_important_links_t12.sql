-- 010 — allow 'T12' as an important_links committee.
--
-- 'T12' is the whole Top 12 officer team: links everyone uses, rather than one
-- committee's. 009's CHECK constraint only knew the four committees, so it is
-- dropped and rebuilt with the extra value.
--
-- Mirrors the `COMMITTEES` union in lib/links.ts — keep the two in sync.
--
-- Safe to re-run.

alter table public.important_links
  drop constraint if exists important_links_committee_check;

alter table public.important_links
  add constraint important_links_committee_check
  check (committee in ('Treasurer', 'VPI', 'Secretary', 'Chapter Development', 'T12'));
