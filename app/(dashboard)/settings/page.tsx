'use client'

import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/use-user'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'

export default function SettingsPage() {
  const { role, hasPermission, loading: userLoading } = useUser()
  const router = useRouter()

  // Redirect if user doesn't have any settings permissions (after loading)
  if (!userLoading && !hasPermission('canManageUsers') && !hasPermission('canManageOrganization')) {
    router.push('/dashboard')
    return null
  }

  // Show loading state while checking permissions
  if (userLoading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your organization settings</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* My Profile */}
          <Link href="/settings/profile">
            <Card padding="lg" className="hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">My Profile</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Manage your personal account settings and password
                  </p>
                </div>
              </div>
            </Card>
          </Link>

          {/* User Management */}
          {hasPermission('canManageUsers') && (
            <Link href="/settings/users">
            <Card padding="lg" className="hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer">
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
            </Card>
            </Link>
          )}

          {/* User Invitations */}
          {hasPermission('canManageUsers') && (
            <Link href="/settings/invitations">
            <Card padding="lg" className="hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">User Invitations</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Invite new users to join your organization
                  </p>
                </div>
              </div>
            </Card>
            </Link>
          )}

          {/* Tax Rates */}
          {hasPermission('canManageOrganization') && (
            <Link href="/settings/tax-rates">
            <Card padding="lg" className="hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer">
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
            </Card>
            </Link>
          )}

          {/* Approval Settings */}
          {hasPermission('canManageOrganization') && (
            <Link href="/settings/approvals">
            <Card padding="lg" className="hover:border-blue-500 dark:hover:border-blue-500 transition-colors cursor-pointer">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Approval Settings</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Configure approval workflow and thresholds
                  </p>
                </div>
              </div>
            </Card>
            </Link>
          )}

          {/* Platform Settings - Super Admin Only */}
          {role === 'SUPER_ADMIN' && (
            <Link href="/settings/platform">
            <Card padding="lg" className="hover:border-red-500 dark:hover:border-red-500 transition-colors cursor-pointer border-red-200 dark:border-red-800">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Platform Settings</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Control signups and global platform settings
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                    Super Admin Only
                  </p>
                </div>
              </div>
            </Card>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
