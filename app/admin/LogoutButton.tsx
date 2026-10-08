'use client'

import { useRouter } from 'next/navigation'
import { FaRightFromBracket } from 'react-icons/fa6'
import { supabase } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      aria-label="Log out"
      className="flex size-10 flex-none items-center justify-center gap-2.5 rounded-sm text-xs md:size-auto md:justify-start md:px-3 md:py-2 font-semibold text-[#A99E8F] transition-colors hover:text-white"
    >
      <FaRightFromBracket aria-hidden className="size-3.5" />
      <span className="hidden md:inline">Log out</span>
    </button>
  )
}
