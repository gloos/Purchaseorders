import { requireAuth } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function DashboardPage() {
  const user = await requireAuth()

  // Get organization with FreeAgent connection status
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          freeAgentAccessToken: true,
          freeAgentTokenExpiry: true
        }
      }
    }
  })

  const isFreeAgentConnected = !!dbUser?.organization?.freeAgentAccessToken

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <nav className="bg-white dark:bg-slate-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-xl font-bold text-slate-900 dark:text-white">
                PO Tool
              </Link>
              <Link href="/purchase-orders" className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                Purchase Orders
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {user.email}
              </span>
              <form action="/auth/signout" method="POST">
                <button
                  type="submit"
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-slate-800 shadow rounded-lg p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
              Welcome to PO Tool
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              You're successfully authenticated! This is your dashboard where you'll manage purchase orders.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <Link href="/purchase-orders" className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                  Purchase Orders
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  Create and manage purchase orders
                </p>
              </Link>
              <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                  Suppliers
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  Coming soon...
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                  FreeAgent Integration
                </h3>
                {isFreeAgentConnected ? (
                  <>
                    <p className="text-sm text-green-600 dark:text-green-400 mt-2 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Connected
                    </p>
                    <Link
                      href="/freeagent/contacts"
                      className="mt-2 inline-block text-sm text-blue-600 hover:text-blue-700"
                    >
                      Manage Contacts →
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                      Connect to sync contacts and create bills
                    </p>
                    <a
                      href="/api/freeagent/authorize"
                      className="mt-2 inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1 px-3 rounded"
                    >
                      Connect FreeAgent
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
