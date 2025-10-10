'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/use-user'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

interface PlatformSettings {
  id: string
  signupsEnabled: boolean
  maxOrganizations: number | null
  currentOrgCount: number
  createdAt: string
  updatedAt: string
}

export default function PlatformSettingsPage() {
  const { role, loading: userLoading } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [formData, setFormData] = useState({
    signupsEnabled: true,
    maxOrganizations: null as number | null
  })

  useEffect(() => {
    if (userLoading) return

    // Only SUPER_ADMIN can access this page
    if (role !== 'SUPER_ADMIN') {
      router.push('/dashboard')
      return
    }

    fetchSettings()
  }, [role, userLoading, router])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/platform-settings')

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setFormData({
          signupsEnabled: data.signupsEnabled,
          maxOrganizations: data.maxOrganizations
        })
      } else {
        const errorData = await response.json()
        setError(`Failed to load settings: ${errorData.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Error fetching platform settings:', err)
      setError('Failed to load platform settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSaving(true)
      setMessage('')
      setError('')

      const response = await fetch('/api/platform-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data)
        setFormData({
          signupsEnabled: data.signupsEnabled,
          maxOrganizations: data.maxOrganizations
        })
        setMessage('Settings saved successfully!')
        setTimeout(() => setMessage(''), 5000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to save settings')
      }
    } catch (err) {
      console.error('Error saving platform settings:', err)
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleResetCount = async () => {
    if (!confirm('Reset organization count to match actual database count? This will recalculate the count based on existing organizations.')) {
      return
    }

    try {
      setResetting(true)
      setMessage('')
      setError('')

      const response = await fetch('/api/platform-settings/reset-count', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        setMessage(`Count reset successfully! New count: ${data.currentOrgCount}`)
        setTimeout(() => setMessage(''), 5000)
        // Refresh settings
        fetchSettings()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to reset count')
      }
    } catch (err) {
      console.error('Error resetting count:', err)
      setError('Failed to reset count')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Platform Settings</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Control global platform settings and signup management
          </p>
        </div>

        {/* Message Display */}
        {message && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200">
            {error}
          </div>
        )}

        {/* Current Status Card */}
        {settings && (
          <Card padding="lg" className="mb-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Current Status</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Signups Status</p>
                <p className={`text-lg font-semibold ${
                  settings.signupsEnabled
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {settings.signupsEnabled ? 'Open' : 'Closed'}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Current Organizations</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {settings.currentOrgCount}
                  {settings.maxOrganizations !== null && ` / ${settings.maxOrganizations}`}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Max Organizations</p>
                <p className="text-lg font-semibold text-slate-900 dark:text-white">
                  {settings.maxOrganizations !== null ? settings.maxOrganizations : 'Unlimited'}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Settings Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card padding="lg">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Signup Control</h2>

            <div className="space-y-6">
              {/* Enable/Disable Signups */}
              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.signupsEnabled}
                    onChange={(e) => setFormData({ ...formData, signupsEnabled: e.target.checked })}
                    className="h-5 w-5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-base font-medium text-slate-900 dark:text-white">
                      Enable Signups
                    </span>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      When disabled, new users cannot create organizations (existing invitations can still be accepted)
                    </p>
                  </div>
                </label>
              </div>

              {/* Max Organizations */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Maximum Organizations Limit
                </label>
                <div className="flex items-center space-x-4">
                  <Input
                    type="number"
                    min="0"
                    value={formData.maxOrganizations ?? ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      maxOrganizations: e.target.value ? parseInt(e.target.value) : null
                    })}
                    placeholder="Leave empty for unlimited"
                    className="flex-1"
                  />
                  {formData.maxOrganizations !== null && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setFormData({ ...formData, maxOrganizations: null })}
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  When limit is reached, signups will automatically close (invitations still work)
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Note:</strong> User invitations bypass the organization limit. Only new signups via the signup page are affected by these settings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={saving}
              isLoading={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="md"
              disabled={resetting}
              isLoading={resetting}
              onClick={handleResetCount}
            >
              {resetting ? 'Resetting...' : 'Reset Count'}
            </Button>
          </div>
        </form>

        {/* Developer Info */}
        {settings && (
          <Card padding="lg" className="mt-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Developer Info</h2>
            <div className="space-y-2 text-sm font-mono text-slate-600 dark:text-slate-400">
              <p>ID: {settings.id}</p>
              <p>Created: {new Date(settings.createdAt).toLocaleString()}</p>
              <p>Last Updated: {new Date(settings.updatedAt).toLocaleString()}</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
