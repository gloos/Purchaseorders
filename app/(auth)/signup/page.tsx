'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

// Force dynamic rendering to avoid build-time environment variable issues
export const dynamic = 'force-dynamic'

type Step = 'account' | 'organization' | 'complete'

export default function SignUpPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('account')

  // Account creation fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  // Organization creation fields
  const [orgName, setOrgName] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [acceptedTerms, setAcceptedTerms] = useState(false)

  // Generate slug from organization name
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleAccountCreation = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      // Move to organization creation step
      setStep('organization')
    } catch (error: any) {
      setError(error.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const handleOrganizationCreation = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const slug = generateSlug(orgName)

      if (!slug || slug.length < 3) {
        throw new Error('Organization name must be at least 3 characters')
      }

      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: orgName, slug }),
      })

      if (!response.ok) {
        const data = await response.json()

        // Show specific error message for closed signups
        if (response.status === 403) {
          throw new Error(data.error || 'Signups are currently closed')
        }

        throw new Error(data.error || 'Failed to create organization')
      }

      // Success - redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      setError(error.message || 'Failed to create organization')
    } finally {
      setLoading(false)
    }
  }

  // Step 1: Account Creation
  if (step === 'account') {

    return (
      <Card padding="lg" className="shadow-xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-medium">
              1
            </div>
            <div className="w-24 h-1 bg-slate-200 dark:bg-slate-600 mx-2"></div>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-400 text-sm font-medium">
              2
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Create Account
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Step 1 of 2: Your account details
          </p>
        </div>

        <form onSubmit={handleAccountCreation} className="space-y-6">
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <Input
          label="Full Name"
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="John Doe"
        />

        <Input
          label="Email"
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          placeholder="you@example.com"
        />

        <div>
          <Input
            label="Password"
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="••••••••"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Must be at least 6 characters
          </p>
        </div>

          <div className="flex items-start">
            <input
              type="checkbox"
              id="terms"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              required
              className="mt-1 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="terms" className="ml-2 text-sm text-slate-600 dark:text-slate-400">
              I agree to the{' '}
              <Link href="/terms" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">
                Terms of Service
              </Link>
              {' '}and{' '}
              <Link href="/privacy" target="_blank" className="text-blue-600 dark:text-blue-400 hover:underline">
                Privacy Policy
              </Link>
            </label>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading || !acceptedTerms}
            isLoading={loading}
            className="w-full"
          >
            {loading ? 'Creating account...' : 'Continue'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Already have an account?{' '}
            <Link
              href="/signin"
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            By signing up, you agree to our{' '}
            <Link
              href="/terms"
              target="_blank"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Terms of Service
            </Link>
            {' '}and{' '}
            <Link
              href="/privacy"
              target="_blank"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
      </Card>
    )
  }

  // Step 2: Organization Creation
  if (step === 'organization') {
    return (
      <Card padding="lg" className="shadow-xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white text-sm font-medium">
              ✓
            </div>
            <div className="w-24 h-1 bg-blue-600 mx-2"></div>
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-medium">
              2
            </div>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Create Organization
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Step 2 of 2: Set up your organization
          </p>
        </div>

        <form onSubmit={handleOrganizationCreation} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <Input
              label="Organization Name"
              id="orgName"
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              minLength={3}
              placeholder="Acme Corporation"
              autoFocus
              helperText="This will be displayed in the navigation bar"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  As the first user, you'll be set up as an Admin with full access to manage purchase orders, settings, and invite team members.
                </p>
              </div>
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
            {loading ? 'Setting up organization...' : 'Complete Setup'}
          </Button>
        </form>
      </Card>
    )
  }

  return null
}
