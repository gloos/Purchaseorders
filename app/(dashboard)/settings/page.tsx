'use client'

import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { useUser } from '@/lib/hooks/use-user'
import Link from 'next/link'

export default function SettingsPage() {
  const { hasPermission, loading: userLoading } = useUser()
  const router = useRouter()

  // Redirect if user doesn't have any settings permissions (after loading)
  if (!userLoading && !hasPermission('canManageUsers') && !hasPermission('canManageOrganization')) {
    router.push('/dashboard')
    return null
  }

  // Show loading state while checking permissions
  if (userLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />
      <div className="p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your organization settings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* User Management */}
          {hasPermission('canManageUsers') && (
            <Link
              href="/settings/users"
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">User Management</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Manage user roles and permissions for your organization
                  </p>
                </div>
              </div>
            </Link>
          )}

          {/* Tax Rates */}
          {hasPermission('canManageOrganization') && (
            <Link
              href="/settings/tax-rates"
              className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:border-blue-500 dark:hover:border-blue-500 transition-colors"
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Tax Rates</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Configure tax rates for purchase orders
                  </p>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
