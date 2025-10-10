'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import * as Sentry from '@sentry/nextjs'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <Card padding="lg" className="max-w-md w-full text-center shadow-xl">
        {/* Icon */}
        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-red-600 dark:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Message */}
        <h1 className="text-6xl font-bold text-slate-900 dark:text-white mb-2">
          500
        </h1>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
          Something Went Wrong
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-2">
          We're sorry, but something unexpected happened. Our team has been notified and is working to fix the issue.
        </p>

        {/* Error Digest (for support) */}
        {error.digest && (
          <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Error ID: {error.digest}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
          <Button
            variant="primary"
            size="md"
            onClick={reset}
            className="w-full sm:w-auto"
          >
            Try Again
          </Button>
          <Link href="/dashboard">
            <Button variant="secondary" size="md" className="w-full sm:w-auto">
              Go to Dashboard
            </Button>
          </Link>
        </div>

        {/* Help Text */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            If this problem persists, please contact your organization administrator
            {error.digest && ` and provide the error ID above`}.
          </p>
        </div>
      </Card>
    </div>
  )
}
