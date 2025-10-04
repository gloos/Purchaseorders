'use client'

import { UserProvider } from '@/lib/hooks/use-user'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <UserProvider>
      {children}
    </UserProvider>
  )
}
