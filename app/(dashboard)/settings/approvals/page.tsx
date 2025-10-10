'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { useUser } from '@/lib/hooks/use-user'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

interface ApprovalSettings {
  approvalThreshold: number
  autoApproveAdmin: boolean
}

export default function ApprovalSettingsPage() {
  const { hasPermission, loading: userLoading } = useUser()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<ApprovalSettings>({
    approvalThreshold: 50,
    autoApproveAdmin: true
  })

  useEffect(() => {
    if (userLoading) return

    // Only ADMIN and SUPER_ADMIN can access this page
    if (!hasPermission('canManageOrganization')) {
      router.push('/dashboard')
      return
    }

    fetchSettings()
  }, [hasPermission, userLoading, router])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/organization/approval-settings')

      if (response.ok) {
        const data = await response.json()
        setFormData(data)
      } else {
        const error = await response.json()
        setError(`Failed to load settings: ${error.error || 'Unknown error'}`)
      }
    } catch (err) {
      console.error('Error fetching approval settings:', err)
      setError('Failed to load approval settings')
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

      const response = await fetch('/api/organization/approval-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        setMessage(data.message || 'Settings saved successfully')
        setFormData({
          approvalThreshold: data.approvalThreshold,
          autoApproveAdmin: data.autoApproveAdmin
        })

        // Clear success message after 3 seconds
        setTimeout(() => setMessage(''), 3000)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to save settings')
      }
    } catch (err) {
      console.error('Error saving approval settings:', err)
      setError('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  // Show loading state while checking permissions
  if (userLoading || loading) {
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
          <div className="flex items-center text-sm text-slate-600 dark:text-slate-400 mb-2">
            <Link href="/settings" className="hover:text-blue-600 dark:hover:text-blue-400">
              Settings
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-900 dark:text-white">Approval Settings</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Approval Workflow Settings</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Configure approval requirements for purchase orders
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

        {/* Settings Form */}
        <Card padding="lg" className="max-w-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Approval Threshold */}
            <div>
              <Input
                label="Approval Threshold (£)"
                type="number"
                id="approvalThreshold"
                min="0"
                max="1000000"
                step="0.01"
                value={formData.approvalThreshold}
                onChange={(e) => setFormData({ ...formData, approvalThreshold: parseFloat(e.target.value) || 0 })}
                required
                helperText="Purchase orders with a subtotal (before tax) equal to or above this amount require approval from an admin. Managers who create POs at or above this threshold must submit them for approval."
              />
            </div>

            {/* Auto-approve Admin POs */}
            <div>
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.autoApproveAdmin}
                  onChange={(e) => setFormData({ ...formData, autoApproveAdmin: e.target.checked })}
                  className="mt-1 h-4 w-4 text-blue-600 border-slate-300 dark:border-slate-600 rounded focus:ring-blue-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Auto-approve purchases by Admins
                  </span>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    When enabled, purchase orders created by Admins and Super Admins are automatically approved
                    regardless of the amount. When disabled, even admin purchases above the threshold require
                    approval from another admin.
                  </p>
                </div>
              </label>
            </div>

            {/* Information Box */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    How approval workflow works
                  </h3>
                  <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Managers can create POs below the threshold directly</li>
                      <li>POs at or above the threshold go to PENDING_APPROVAL status</li>
                      <li>Admins and Super Admins receive email notifications for approval requests</li>
                      <li>Approved POs are automatically sent to suppliers</li>
                      <li>Denied POs return to DRAFT status and can be edited and resubmitted</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={saving}
                isLoading={saving}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
