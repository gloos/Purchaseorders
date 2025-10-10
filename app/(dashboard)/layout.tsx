'use client'

import { useState } from 'react'
import { UserProvider } from '@/lib/hooks/use-user'
import { Sidebar } from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <UserProvider>
      <div className="flex h-screen bg-gray-50 dark:bg-slate-900">
        {/* Sidebar */}
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:ml-64">
          {/* Mobile Header with Menu Toggle */}
          <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setSidebarOpen(true)}
              className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">HelixFlow</h1>
            <div className="w-6" /> {/* Spacer for centering */}
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </UserProvider>
  )
}
