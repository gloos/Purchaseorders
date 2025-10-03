'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Navbar() {
  const pathname = usePathname()

  const handleSignOut = async () => {
    const form = document.createElement('form')
    form.method = 'POST'
    form.action = '/auth/signout'
    document.body.appendChild(form)
    form.submit()
  }

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/')
  }

  return (
    <nav className="bg-white dark:bg-slate-800 shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-slate-900 dark:text-white">
              PO Tool
            </Link>
            <Link
              href="/dashboard"
              className={`text-sm ${
                isActive('/dashboard')
                  ? 'text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/purchase-orders"
              className={`text-sm ${
                isActive('/purchase-orders')
                  ? 'text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Purchase Orders
            </Link>
            <Link
              href="/freeagent/contacts"
              className={`text-sm ${
                isActive('/freeagent/contacts')
                  ? 'text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Contacts
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleSignOut}
              className="text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
