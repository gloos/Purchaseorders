'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Navbar } from '@/components/navbar'
import { useUser } from '@/lib/hooks/use-user'
import { UserRole } from '@prisma/client'

interface User {
  id: string
  email: string
  name: string | null
  role: UserRole
  createdAt: string
  updatedAt: string
}

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  VIEWER: 'Viewer'
}

const roleColors: Record<UserRole, string> = {
  ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  MANAGER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  VIEWER: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
}

export default function UsersPage() {
  const { hasPermission, loading: userLoading } = useUser()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    // Wait for user role to load
    if (userLoading) return

    // Redirect if user doesn't have permission
    if (!hasPermission('canManageUsers')) {
      router.push('/dashboard')
      return
    }

    fetchUsers()
  }, [hasPermission, userLoading, router])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      } else {
        const error = await response.json()
        setMessage(`Error: ${error.error || 'Failed to fetch users'}`)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
      setMessage('Error: Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setUpdating(userId)
      setMessage('')

      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('User role updated successfully')
        // Update the user in the list
        setUsers(users.map(user =>
          user.id === userId ? { ...user, role: newRole } : user
        ))
      } else {
        setMessage(`Error: ${data.error || 'Failed to update user role'}`)
      }
    } catch (error) {
      console.error('Error updating user role:', error)
      setMessage('Error: Failed to update user role')
    } finally {
      setUpdating(null)
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
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">User Management</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage user roles and permissions</p>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.startsWith('Error')
              ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
              : 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
          }`}>
            {message}
          </div>
        )}

        {/* Users List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-12 text-center">
            <p className="text-slate-600 dark:text-slate-400">No users found</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">
                        {user.name || 'No name'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 dark:text-white">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${roleColors[user.role]}`}>
                        {roleLabels[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        disabled={updating === user.id}
                        className="border border-slate-300 dark:border-slate-600 rounded px-3 py-1 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <option value="ADMIN">Admin</option>
                        <option value="MANAGER">Manager</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      {updating === user.id && (
                        <span className="ml-2 text-sm text-slate-500 dark:text-slate-400">Updating...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Role Descriptions */}
        <div className="mt-8 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Role Permissions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200">Admin</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Full access to all features including user management, organization settings, and all purchase order operations.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Manager</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Can create, edit, approve, send, and delete purchase orders. Cannot manage users or organization settings.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">Viewer</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Read-only access to view purchase orders. Cannot create, edit, or delete purchase orders.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
