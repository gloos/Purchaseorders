'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { useUser } from '@/lib/hooks/use-user'
import { UserRole, InvitationStatus } from '@prisma/client'
import Link from 'next/link'
import { InviteUserModal } from '@/components/invite-user-modal'

interface Invitation {
  id: string
  email: string
  role: UserRole
  status: InvitationStatus
  createdAt: string
  expiresAt: string
  acceptedAt: string | null
  invitedBy: {
    name: string
    email: string
  }
}

const STATUS_COLORS = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
  ACCEPTED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
  EXPIRED: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
}

const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Administrator',
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  VIEWER: 'Viewer'
}

export default function InvitationsPage() {
  const { hasPermission, loading: userLoading } = useUser()
  const router = useRouter()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)

  useEffect(() => {
    // Wait for user role to load
    if (userLoading) return

    // Redirect if user doesn't have permission
    if (!hasPermission('canManageUsers')) {
      router.push('/dashboard')
      return
    }

    fetchInvitations()
  }, [hasPermission, userLoading, router])

  const fetchInvitations = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/invitations')
      if (response.ok) {
        const data = await response.json()
        setInvitations(data.invitations)
      } else {
        setMessage('Failed to load invitations')
      }
    } catch (error) {
      console.error('Error fetching invitations:', error)
      setMessage('Failed to load invitations')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelInvitation = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return
    }

    try {
      const response = await fetch(`/api/invitations/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setMessage('Invitation cancelled successfully')
        fetchInvitations()
      } else {
        const data = await response.json()
        setMessage(data.error || 'Failed to cancel invitation')
      }
    } catch (error) {
      console.error('Error cancelling invitation:', error)
      setMessage('Failed to cancel invitation')
    }
  }

  if (userLoading || !hasPermission('canManageUsers')) {
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
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">User Invitations</h1>
            <button
              onClick={() => setShowInviteModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              + Invite User
            </button>
          </div>
          <p className="text-slate-600 dark:text-slate-400">Manage pending and completed user invitations</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('success') || message.includes('successfully')
              ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
          }`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          </div>
        ) : invitations.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
            <p className="text-slate-600 dark:text-slate-400 mb-4">No invitations found</p>
            <button
              onClick={() => setShowInviteModal(true)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Invite your first user
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Invited By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {invitations.map((invitation) => (
                  <tr key={invitation.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-white">
                      {invitation.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {ROLE_LABELS[invitation.role]}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${STATUS_COLORS[invitation.status]}`}>
                        {invitation.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {invitation.invitedBy.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-400">
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {invitation.status === 'PENDING' && (
                        <button
                          onClick={() => handleCancelInvitation(invitation.id)}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6">
          <Link
            href="/settings"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Settings
          </Link>
        </div>
      </div>

      {/* Invite User Modal */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => {
          setMessage('Invitation sent successfully!')
          fetchInvitations()
        }}
      />
    </div>
  )
}
