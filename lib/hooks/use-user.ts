'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { UserRole } from '@prisma/client'
import { hasPermission, Permission } from '@/lib/rbac'

interface UserContextType {
  role: UserRole | null
  loading: boolean
  hasPermission: (permission: Permission) => boolean
}

const UserContext = createContext<UserContextType>({
  role: null,
  loading: true,
  hasPermission: () => false
})

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserRole()
  }, [])

  const fetchUserRole = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const data = await response.json()
        setRole(data.role)
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkPermission = (permission: Permission): boolean => {
    if (!role) return false
    return hasPermission(role, permission)
  }

  return (
    <UserContext.Provider value={{ role, loading, hasPermission: checkPermission }}>
      {children}
    </UserContext.Provider>
  )
}
