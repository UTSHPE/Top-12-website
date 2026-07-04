'use client'

import { useState } from 'react'
import { checkIn } from '@/app/actions/checkIn'

type Result = { success: true; points: number } | { success: false; error: string } | null

function errorMessage(error: string): string {
  const messages: Record<string, string> = {
    invalid_code: "That code doesn't match any active event. Double-check the slide.",
    window_closed: 'The check-in window for this event has closed.',
    member_not_found: "Your EID isn't registered. Contact an officer.",
    already_signed_in: "You're already checked in to this event.",
  }
  return messages[error] ?? 'Something went wrong. Try again.'
}

export default function CheckInPage() {
  const [eid, setEid] = useState('')
  const [code, setCode] = useState('')
  const [result, setResult] = useState<Result>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    const res = await checkIn({ eid: eid.trim(), accessCode: code.trim().toUpperCase() })
    setResult(res)
    setLoading(false)
  }

  if (result?.success) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8 text-center">
          <div className="mb-4 text-5xl">✓</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re checked in!</h1>
          <p className="text-gray-500 text-sm">
            You earned{' '}
            <span className="font-semibold text-orange-600">{result.points} points</span>.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Check In</h1>
          <p className="mt-1 text-sm text-gray-500">Enter the code shown on the slide</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">UT EID</label>
            <input
              type="text"
              placeholder="e.g. ab12345"
              value={eid}
              onChange={e => setEid(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Access Code</label>
            <input
              type="text"
              placeholder="6-character code"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-3 text-sm tracking-widest font-mono uppercase focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {result && !result.success && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
              {errorMessage(result.error)}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading || !eid.trim() || code.trim().length < 6}
            className="w-full rounded-lg bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-semibold py-3 text-sm transition-colors"
          >
            {loading ? 'Checking in...' : 'Check In'}
          </button>
        </div>
      </div>
    </main>
  )
}
