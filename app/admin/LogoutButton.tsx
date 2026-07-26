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
      className="flex flex-none items-center gap-2.5 rounded-sm px-2 py-2 text-xs font-semibold text-[#A99E8F] transition-colors hover:text-white md:px-3"
    >
      <FaRightFromBracket aria-hidden className="size-3.5" />
      <span className="hidden md:inline">Log out</span>
    </button>
  )
}
