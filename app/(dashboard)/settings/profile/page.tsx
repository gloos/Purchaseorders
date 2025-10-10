'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/use-user'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import Link from 'next/link'

export default function UserProfilePage() {
  const { user, loading: userLoading } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  // Profile form
  const [name, setName] = useState('')

  // Password form
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    if (!userLoading && user) {
      setName(user.name || '')
    }
  }, [user, userLoading])

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Profile updated successfully')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(data.error || 'Failed to update profile')
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(pass)) return 'Password must contain at least one uppercase letter'
    if (!/[0-9]/.test(pass)) return 'Password must contain at least one number'
    return null
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    // Validate new password
    const passwordError = validatePassword(newPassword)
    if (passwordError) {
      setError(passwordError)
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('Password changed successfully')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(data.error || 'Failed to change password')
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

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
          <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 mb-2">
            <Link href="/settings" className="hover:text-blue-600 dark:hover:text-blue-400">
              Settings
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-900 dark:text-white">My Profile</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Profile</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage your personal account settings
          </p>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">{message}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 max-w-2xl">
          {/* Profile Information */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Profile Information
            </h2>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <Input
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input
                label="Email Address"
                type="email"
                value={user?.email || ''}
                disabled
                helperText="Email cannot be changed"
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={loading}
                  isLoading={loading}
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Change Password */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Change Password
            </h2>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />

              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                helperText="Minimum 8 characters, 1 uppercase letter, 1 number"
              />

              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={loading || !currentPassword || !newPassword || !confirmPassword}
                  isLoading={loading}
                >
                  Change Password
                </Button>
              </div>
            </form>
          </Card>

          {/* Account Actions */}
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Account Actions
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Need to delete your account? Please contact your administrator.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
