'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

interface Contact {
  id: string
  freeAgentId: string
  name: string
  email?: string | null
  phone?: string | null
  address?: string | null
  isActive: boolean
  syncedAt: string
}

function FreeAgentContactsContent() {
  const searchParams = useSearchParams()
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState('')
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null)

  useEffect(() => {
    // Check for success/error messages
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success === 'freeagent_connected') {
      setMessage('FreeAgent connected successfully! You can now sync contacts.')
    } else if (error) {
      setMessage(`Error: ${error}`)
    }

    fetchContacts()
  }, [searchParams])

  const fetchContacts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/contacts')
      if (response.ok) {
        const data = await response.json()
        setContacts(data)
      }
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    try {
      setSyncing(true)
      setMessage('')
      setSyncProgress(null)

      // Start with indeterminate progress
      setSyncProgress({ current: 0, total: 100 })

      const response = await fetch('/api/freeagent/sync-contacts', {
        method: 'POST'
      })

      if (!response.ok) {
        // Handle non-JSON error responses (like 504 HTML pages)
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          setMessage(`Error: ${data.error || 'Failed to sync contacts'}`)
        } else {
          if (response.status === 504) {
            setMessage('Error: Sync timed out. Your contact list may be very large. Please try again in a few minutes.')
          } else {
            setMessage(`Error: Server returned ${response.status}. Please try again.`)
          }
        }
        return
      }

      const data = await response.json()

      if (data.hasMore) {
        setMessage(`Synced ${data.total} contacts (Created: ${data.created}, Updated: ${data.updated}). Click sync again to continue with remaining contacts.`)
      } else {
        setMessage(`Successfully synced! Created: ${data.created}, Updated: ${data.updated}, Total: ${data.total}. All contacts are now synced.`)
      }

      // Fetch contacts again to show the new data
      fetchContacts()
    } catch (error) {
      console.error('Error syncing contacts:', error)
      setMessage('Error: Failed to sync contacts. Please check your internet connection and try again.')
    } finally {
      setSyncing(false)
      setSyncProgress(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">FreeAgent Contacts</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">Manage contacts synced from FreeAgent</p>
          </div>
          <Button
            onClick={handleSync}
            disabled={syncing}
            isLoading={syncing}
            variant="primary"
            size="md"
            title={syncing ? 'This may take up to 60 seconds for large contact lists' : 'Sync contacts from FreeAgent'}
          >
            {syncing ? 'Syncing... (this may take a minute)' : 'Sync from FreeAgent'}
          </Button>
        </div>
      </div>

      {/* Sync Progress Indicator */}
      {syncing && syncProgress && (
        <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
              Syncing contacts from FreeAgent...
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-2 overflow-hidden">
            <div className="bg-blue-600 h-2 rounded-full animate-pulse w-full"></div>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
            This may take up to a minute for large contact lists. Please don't close this page.
          </p>
        </div>
      )}

      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.startsWith('Error')
            ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
            : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
        }`}>
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
        </div>
      ) : contacts.length === 0 ? (
        <Card padding="lg" className="text-center">
          <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-white">No contacts yet</h3>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Click "Sync from FreeAgent" to import your contacts</p>
        </Card>
      ) : (
        <Card padding="sm" className="overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Last Synced
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-slate-900 dark:text-white max-w-xs truncate" title={contact.name}>
                      {contact.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-white">{contact.email || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-white">{contact.phone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      contact.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {contact.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">
                    {new Date(contact.syncedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      </div>
    </div>
  )
}

export default function FreeAgentContactsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
      </div>
    }>
      <FreeAgentContactsContent />
    </Suspense>
  )
}
