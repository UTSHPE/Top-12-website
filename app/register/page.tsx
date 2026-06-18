'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'

const CLASSES = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate']

type FormState = {
  first_name: string
  last_name: string
  email: string
  eid: string
  major: string
  Class: string
  DOB: string
}

const EMPTY_FORM: FormState = {
  first_name: '',
  last_name: '',
  email: '',
  eid: '',
  major: '',
  Class: '',
  DOB: '',
}

export default function RegisterPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    setErrorMsg('')

    const { error } = await supabase.from('members').insert({
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      eid: form.eid,
      major: form.major,
      position: 'Member',
      Class: form.Class,
      DOB: form.DOB,
    })

    if (error) {
      setStatus('error')
      setErrorMsg(
        error.code === '23505'
          ? 'An account with this EID or email already exists.'
          : error.message
      )
    } else {
      setStatus('success')
      setForm(EMPTY_FORM)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Join UT SHPE</h1>
          <p className="mt-2 text-sm text-gray-500">
            Register your profile to join the chapter
          </p>
        </div>

        {status === 'success' && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-green-800 text-sm">
            Registration successful! Welcome to UT SHPE.
          </div>
        )}

        {status === 'error' && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-red-800 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              UT EID
            </label>
            <input
              type="text"
              name="eid"
              value={form.eid}
              onChange={handleChange}
              required
              placeholder="e.g. ab12345"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Major
            </label>
            <input
              type="text"
              name="major"
              value={form.major}
              onChange={handleChange}
              required
              placeholder="e.g. Electrical Engineering"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Classification
              </label>
              <select
                name="Class"
                value={form.Class}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
              >
                <option value="" disabled>
                  Select class
                </option>
                {CLASSES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                name="DOB"
                value={form.DOB}
                onChange={handleChange}
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={status === 'loading'}
            className="w-full rounded-lg bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-semibold py-2.5 text-sm transition-colors"
          >
            {status === 'loading' ? 'Registering...' : 'Register'}
          </button>
        </form>
      </div>
    </main>
  )
}
