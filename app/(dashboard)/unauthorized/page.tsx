'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export default function UnauthorizedPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <Card padding="lg" className="max-w-md w-full text-center shadow-xl">
        {/* Icon */}
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-amber-600 dark:text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        {/* Error Message */}
        <h1 className="text-6xl font-bold text-slate-900 dark:text-white mb-2">
          403
        </h1>
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
          Access Denied
        </h2>
        <p className="text-slate-600 dark:text-slate-400 mb-8">
          You don't have permission to access this page. If you believe this is an error, please contact your organization administrator.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            size="md"
            onClick={() => router.back()}
            className="w-full sm:w-auto"
          >
            Go Back
          </Button>
          <Link href="/dashboard">
            <Button variant="secondary" size="md" className="w-full sm:w-auto">
              Go to Dashboard
            </Button>
          </Link>
        </div>

        {/* Help Text */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              <strong className="text-slate-900 dark:text-white">Need higher permissions?</strong>
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Contact your administrator to request the necessary permissions for this feature.
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}
