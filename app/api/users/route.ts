import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { requirePermission } from '@/lib/rbac'

// GET /api/users - List all users in organization
export async function GET() {
  try {
    const { user, organizationId } = await getUserAndOrgOrThrow()

    // Check permission to manage users
    requirePermission(user.role, 'canManageUsers')

    const users = await prisma.user.findMany({
      where: {
        organizationId
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)

    const { AuthorizationError } = await import('@/lib/rbac')

    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'No organization found') {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
