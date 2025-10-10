'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@/lib/hooks/use-user'
import { UserRole } from '@prisma/client'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Select'

interface User {
  id: string
  email: string
  name: string | null
  role: UserRole
  createdAt: string
  updatedAt: string
}

const roleLabels: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  VIEWER: 'Viewer'
}

const roleColors: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
  ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200',
  MANAGER: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200',
  VIEWER: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-200'
}

export default function UsersPage() {
  const { hasPermission, loading: userLoading, role: userRole } = useUser()
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

  // Determine which role descriptions to show based on user's role
  const shouldShowRoleDescription = (role: UserRole): boolean => {
    if (!userRole) return false

    const roleHierarchy: Record<UserRole, number> = {
      'SUPER_ADMIN': 4,
      'ADMIN': 3,
      'MANAGER': 2,
      'VIEWER': 1
    }

    // Show roles at or below the user's level
    return roleHierarchy[role] <= roleHierarchy[userRole]
  }

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
      <div className="flex items-center justify-center h-full py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
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
          <Card padding="lg" className="text-center">
            <p className="text-slate-600 dark:text-slate-400">No users found</p>
          </Card>
        ) : (
          <Card padding="sm" className="overflow-hidden">
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
                      <div className="flex items-center gap-2">
                        <Select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          disabled={updating === user.id}
                          className="text-sm min-w-[140px]"
                          options={[
                            { value: 'SUPER_ADMIN', label: 'Super Admin' },
                            { value: 'ADMIN', label: 'Admin' },
                            { value: 'MANAGER', label: 'Manager' },
                            { value: 'VIEWER', label: 'Viewer' }
                          ]}
                        />
                        {updating === user.id && (
                          <span className="text-sm text-slate-500 dark:text-slate-400">Updating...</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Role Descriptions */}
        <Card padding="lg" className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Role Permissions</h2>
          <div className="space-y-4">
            {shouldShowRoleDescription('SUPER_ADMIN') && (
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Super Admin</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Platform owner with complete control over all features, user management, organization settings, and purchase order operations. Highest level of access.
                </p>
              </div>
            )}
            {shouldShowRoleDescription('ADMIN') && (
              <div>
                <h3 className="text-sm font-medium text-purple-800 dark:text-purple-200">Admin</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Full access to all features including user management, organization settings, and all purchase order operations.
                </p>
              </div>
            )}
            {shouldShowRoleDescription('MANAGER') && (
              <div>
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Manager</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Can create, edit, approve, send, and delete purchase orders. Cannot manage users or organization settings.
                </p>
              </div>
            )}
            {shouldShowRoleDescription('VIEWER') && (
              <div>
                <h3 className="text-sm font-medium text-gray-800 dark:text-gray-200">Viewer</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Read-only access to view purchase orders. Cannot create, edit, or delete purchase orders.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
