import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

// Auth wall for the officer admin dashboard. Only the Top 12 officers ever
// have accounts, so a valid session is itself proof of officer status —
// unauthenticated requests to /admin/* are bounced to the login page.
//
// NOTE: this is Next.js 16's `proxy` file convention (formerly `middleware`).
export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
