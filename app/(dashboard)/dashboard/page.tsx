import { requireAuth } from '@/lib/auth-helpers'

export default async function DashboardPage() {
  const user = await requireAuth()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <nav className="bg-white dark:bg-slate-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                PO Tool
              </h1>
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
              <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-slate-900 dark:text-white">
                  Purchase Orders
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  Coming soon...
                </p>
              </div>
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
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                  Coming soon...
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
