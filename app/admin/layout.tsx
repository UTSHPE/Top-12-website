import { getOfficer } from '@/lib/officer'
import { initialsOf } from '@/components/Avatar'
import Logo from '@/components/Logo'
import AdminNav from './AdminNav'
import LogoutButton from './LogoutButton'

/**
 * Officer console shell. A dark sidebar beside the page content on laptops;
 * under `md`, a slim top bar plus a bottom tab bar (see AdminNav), because
 * officers run events from their phones.
 *
 * The column templates are `minmax(0, 1fr)`, never bare `1fr` or implicit:
 * an implicit track sizes to its content's max-content, and the nav alone made
 * every console page 803px wide on a phone.
 *
 * Everything under /admin is already behind the proxy auth wall (see proxy.ts),
 * so this only has to render the chrome.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const officer = await getOfficer()

  return (
    <div className="grid min-h-screen grid-cols-[minmax(0,1fr)] grid-rows-[auto_1fr] bg-bg md:grid-cols-[230px_minmax(0,1fr)] md:grid-rows-1">
      <aside className="flex items-center gap-3 bg-ink px-4 py-2.5 text-white md:flex-col md:items-stretch md:gap-0 md:px-4 md:py-6">
        <Logo height={30} chip className="md:mb-1.5 md:self-start" />

        <div className="ml-1.5 hidden text-[11px] tracking-[.09em] text-[#A99E8F] uppercase md:mb-[22px] md:block">
          Officer Console
        </div>

        {/* Holds the sidebar nav on desktop. On a phone the section links
            live in the fixed bottom bar instead, and this just pushes the
            avatar and log out to the right. */}
        <div className="min-w-0 flex-1 md:flex-none">
          <AdminNav />
        </div>

        <div className="flex flex-none items-center gap-1 md:mt-auto md:flex-col md:items-stretch md:gap-3 md:border-t md:border-white/15 md:pt-4">
          {officer && (
            <div className="flex items-center gap-2.5">
              <span className="flex size-[34px] flex-none items-center justify-center rounded-full bg-[#E5562B] text-xs font-bold">
                {initialsOf(officer.name)}
              </span>
              <div className="hidden min-w-0 text-xs md:block">
                <div className="truncate font-bold">{officer.name}</div>
                <div className="truncate text-[10px] text-[#A99E8F]">{officer.role}</div>
              </div>
            </div>
          )}
          <LogoutButton />
        </div>
      </aside>

      {/* Bottom padding keeps the last row clear of the phone tab bar. */}
      <div className="flex min-w-0 flex-col pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
        {children}
      </div>
    </div>
  )
}
