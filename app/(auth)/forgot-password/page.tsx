'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      // Always show success to prevent email enumeration
      setSubmitted(true)
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
        <Card padding="lg" className="max-w-md w-full">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Check Your Email
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              If an account exists with {email}, we've sent a password reset link.
              The link will expire in 1 hour.
            </p>
            <Link href="/signin">
              <Button variant="primary" size="md" className="w-full">
                Back to Sign In
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card padding="lg" className="max-w-md w-full">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            Reset Your Password
          </h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-800 bg-red-100 dark:text-red-200 dark:bg-red-900/30 rounded">
                {error}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />

            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full"
              disabled={loading}
              isLoading={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <div className="text-center">
              <Link href="/signin" className="text-sm text-blue-600 hover:text-blue-700">
                Back to Sign In
              </Link>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}
