'use client'

import { useState } from 'react'
import { createEvent } from '@/app/actions/createEvent'

const EVENT_TYPES = [
  'General Meeting',
  'Study Night',
  'Professional Development',
  'Social',
  'Community Service',
  'Other',
]

const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent'
const LABEL = 'block text-sm font-medium text-gray-700 mb-1'

export default function CreateEventPage() {
  const [title, setTitle] = useState('')
  const [location, setLocation] = useState('')
  const [eventType, setEventType] = useState('')
  const [createdByOfficer, setCreatedByOfficer] = useState('')
  const [calendarStart, setCalendarStart] = useState('')
  const [calendarEnd, setCalendarEnd] = useState('')
  const [checkInStart, setCheckInStart] = useState('')
  const [checkInEnd, setCheckInEnd] = useState('')
  const [basePoints, setBasePoints] = useState(1)
  const [multiplier, setMultiplier] = useState(1.0)
  const [isRecurring, setIsRecurring] = useState(false)
  const [weekCount, setWeekCount] = useState(2)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    try {
      await createEvent({
        title,
        location,
        eventType,
        createdByOfficer,
        calendarStart: new Date(calendarStart),
        calendarEnd: new Date(calendarEnd),
        checkInStart: new Date(checkInStart),
        checkInEnd: new Date(checkInEnd),
        basePoints,
        multiplier,
        isRecurring,
        weekCount: isRecurring ? weekCount : 1,
      })

      setSuccessMsg(
        isRecurring
          ? `${weekCount} events created successfully!`
          : 'Event created successfully!'
      )
      setStatus('success')
      setTitle('')
      setLocation('')
      setEventType('')
      setCreatedByOfficer('')
      setCalendarStart('')
      setCalendarEnd('')
      setCheckInStart('')
      setCheckInEnd('')
      setBasePoints(1)
      setMultiplier(1.0)
      setIsRecurring(false)
      setWeekCount(2)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Failed to create event.')
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Create Event</h1>
          <p className="mt-2 text-sm text-gray-500">Fill out event details for the chapter</p>
        </div>

        {status === 'success' && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm">
            {successMsg}
          </div>
        )}
        {status === 'error' && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className={LABEL}>Event Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="e.g. SNAP Study Night"
              className={INPUT}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Location</label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                required
                placeholder="e.g. GDC 2.210"
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Event Type</label>
              <select
                value={eventType}
                onChange={e => setEventType(e.target.value)}
                required
                className={`${INPUT} bg-white`}
              >
                <option value="" disabled>Select type</option>
                {EVENT_TYPES.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className={LABEL}>Created By (Officer Name)</label>
            <input
              type="text"
              value={createdByOfficer}
              onChange={e => setCreatedByOfficer(e.target.value)}
              required
              placeholder="e.g. Maria Garcia"
              className={INPUT}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Calendar Start</label>
              <input
                type="datetime-local"
                value={calendarStart}
                onChange={e => setCalendarStart(e.target.value)}
                required
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Calendar End</label>
              <input
                type="datetime-local"
                value={calendarEnd}
                onChange={e => setCalendarEnd(e.target.value)}
                required
                className={INPUT}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Check-In Start</label>
              <input
                type="datetime-local"
                value={checkInStart}
                onChange={e => setCheckInStart(e.target.value)}
                required
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Check-In End</label>
              <input
                type="datetime-local"
                value={checkInEnd}
                onChange={e => setCheckInEnd(e.target.value)}
                required
                className={INPUT}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Base Points</label>
              <input
                type="number"
                value={basePoints}
                min={1}
                onChange={e => setBasePoints(Number(e.target.value))}
                required
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>Multiplier</label>
              <input
                type="number"
                value={multiplier}
                min={0.1}
                step={0.1}
                onChange={e => setMultiplier(Number(e.target.value))}
                required
                className={INPUT}
              />
            </div>
          </div>

          {/* Recurrence */}
          <div className="border-t pt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isRecurring}
                onChange={e => setIsRecurring(e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              Repeat weekly
            </label>

            {isRecurring && (
              <div>
                <label className={LABEL}>Number of Weeks</label>
                <select
                  value={weekCount}
                  onChange={e => setWeekCount(Number(e.target.value))}
                  className={`${INPUT} bg-white w-40`}
                >
                  {Array.from({ length: 15 }, (_, i) => i + 2).map(n => (
                    <option key={n} value={n}>{n} weeks</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full rounded-lg bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-semibold py-2.5 text-sm transition-colors"
          >
            {status === 'loading'
              ? 'Creating...'
              : isRecurring
              ? `Create ${weekCount} Events`
              : 'Create Event'}
          </button>
        </form>
      </div>
    </main>
  )
}
