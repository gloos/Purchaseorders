'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useUser } from '@/lib/hooks/use-user'

interface CompanyProfile {
  name: string
  logoUrl?: string | null
}

export function Navbar() {
  const pathname = usePathname()
  const { hasPermission } = useUser()
  const [profile, setProfile] = useState<CompanyProfile | null>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/organization/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
      }
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }

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
            <Link href="/dashboard" className="flex items-center space-x-3">
              {profile?.logoUrl && (
                <div className="relative w-8 h-8">
                  <Image
                    src={profile.logoUrl}
                    alt={profile.name || 'Company Logo'}
                    fill
                    className="object-contain"
                  />
                </div>
              )}
              <span className="text-xl font-bold text-slate-900 dark:text-white">
                {profile?.name || 'PO Tool'}
              </span>
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
            <Link
              href="/profile"
              className={`text-sm ${
                isActive('/profile')
                  ? 'text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Profile
            </Link>
            {hasPermission('canManageUsers') && (
              <Link
                href="/settings/users"
                className={`text-sm ${
                  isActive('/settings')
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Settings
              </Link>
            )}
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
