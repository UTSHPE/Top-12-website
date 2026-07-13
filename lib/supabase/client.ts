import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cookie-backed browser client. Storing the session in cookies (not
// localStorage) is what lets the proxy and Server Components read the same
// session on the server.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
