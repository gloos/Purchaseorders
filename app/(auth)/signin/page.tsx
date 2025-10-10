'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

// Force dynamic rendering to avoid build-time environment variable issues
export const dynamic = 'force-dynamic'

function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo')

  useEffect(() => {
    // Show message if redirected from a protected route
    if (redirectTo) {
      setMessage('Please sign in to continue')
    }
  }, [redirectTo])

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Redirect to the original page or dashboard
      router.push(redirectTo || '/dashboard')
      // Note: router.refresh() removed to prevent navigation conflicts
    } catch (error: any) {
      setError(error.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card padding="lg" className="shadow-xl">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Welcome Back
        </h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">
          Sign in to your HelixFlow account
        </p>
      </div>

      <form onSubmit={handleSignIn} className="space-y-6">
        {message && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 px-4 py-3 rounded">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div>
          <Input
            label="Email"
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
          />
        </div>

        <div>
          <Input
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
          />
          <div className="mt-2 text-right">
            <Link href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              Forgot Password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={loading}
          isLoading={loading}
          className="w-full"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Don't have an account?{' '}
          <Link
            href="/signup"
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>
    </Card>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <Card padding="lg" className="shadow-xl">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </Card>
    }>
      <SignInForm />
    </Suspense>
  )
}
