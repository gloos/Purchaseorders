'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { createClient } from '@/lib/supabase/client'

export default function VerifyEmailPage() {
  const router = useRouter()
  const [resending, setResending] = useState(false)
  const [message, setMessage] = useState('')
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const checkUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/signin')
        return
      }

      if (user.email_confirmed_at) {
        router.push('/dashboard')
        return
      }

      setUserEmail(user.email || '')
    }

    checkUser()
  }, [router])

  const handleResend = async () => {
    setResending(true)
    setMessage('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail
      })

      if (error) throw error

      setMessage('Verification email sent! Please check your inbox.')
    } catch (error) {
      setMessage('Failed to resend email. Please try again.')
    } finally {
      setResending(false)
    }
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/signin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <Card padding="lg" className="max-w-md w-full text-center">
        <div className="mb-4">
          <svg className="mx-auto h-12 w-12 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>

        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
          Verify Your Email
        </h2>

        <p className="text-slate-600 dark:text-slate-400 mb-6">
          We've sent a verification email to:
          <br />
          <strong className="text-slate-900 dark:text-white">{userEmail}</strong>
        </p>

        <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
          Please click the link in the email to verify your account.
          Check your spam folder if you don't see it.
        </p>

        {message && (
          <div className={`p-3 text-sm rounded mb-4 ${
            message.includes('sent')
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
          }`}>
            {message}
          </div>
        )}

        <div className="space-y-3">
          <Button
            onClick={handleResend}
            disabled={resending}
            isLoading={resending}
            variant="primary"
            size="md"
            className="w-full"
          >
            {resending ? 'Resending...' : 'Resend Verification Email'}
          </Button>

          <Button
            onClick={handleSignOut}
            variant="ghost"
            size="md"
            className="w-full"
          >
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  )
}
