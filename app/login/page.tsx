'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { FaArrowRight } from 'react-icons/fa6'
import { supabase } from '@/lib/supabase/client'
import ErrorStrip from '@/components/ErrorStrip'
import Logo from '@/components/Logo'

const INPUT =
  'w-full rounded-[10px] border-[1.5px] border-line bg-surface px-[13px] py-[11px] text-[15px] font-semibold outline-none transition-colors focus:border-primary-bright'
const LABEL = 'mb-1.5 block text-[13px] font-semibold text-muted'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/admin'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setStatus('error')
      return
    }

    // Refresh so Server Components (and the proxy) see the new session cookie.
    router.push(next)
    router.refresh()
  }

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 text-center">
          <Logo height={30} className="mb-6" />
          <p className="mb-2 text-[11px] font-bold tracking-[.09em] text-faint uppercase">
            Officer Console
          </p>
          <h1 className="font-display text-[26px] font-extrabold tracking-[-.5px]">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-faint">
            Top 12 accounts only — members don&apos;t need to log in to check in.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-xl bg-surface p-6 shadow-card sm:p-7"
        >
          {status === 'error' && (
            <ErrorStrip
              title="That didn't work."
              detail="Check the email and password, or ask another officer to reset it."
            />
          )}

          <div>
            <label className={LABEL} htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL} htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={INPUT}
            />
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="mt-1 flex w-full items-center justify-center gap-2.5 rounded-md bg-primary-bright p-3.5 text-base font-bold text-white shadow-cta transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:bg-primary-bright/50 disabled:shadow-none"
          >
            {status === 'loading' ? 'Signing in…' : 'Sign in'}
            {status !== 'loading' && <FaArrowRight aria-hidden className="size-3.5" />}
          </button>
        </form>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
