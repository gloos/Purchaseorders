import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { requirePermission } from '@/lib/rbac'
import { UserRole } from '@prisma/client'

// PATCH /api/users/[id]/role - Update user's role
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, organizationId } = await getUserAndOrgOrThrow()

    // Check permission to change user roles
    requirePermission(user.role, 'canChangeUserRoles')

    const body = await request.json()
    const { role } = body

    // Validate role
    if (!role || !['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'VIEWER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be SUPER_ADMIN, ADMIN, MANAGER, or VIEWER' },
        { status: 400 }
      )
    }

    // Only SUPER_ADMIN can assign SUPER_ADMIN role
    if (role === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only Super Admins can assign the Super Admin role' },
        { status: 403 }
      )
    }

    // Verify the target user belongs to the same organization
    const targetUser = await prisma.user.findFirst({
      where: {
        id: params.id,
        organizationId
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only SUPER_ADMIN can modify another SUPER_ADMIN's role
    if (targetUser.role === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only Super Admins can modify Super Admin roles' },
        { status: 403 }
      )
    }

    // Prevent user from changing their own role
    if (params.id === user.id) {
      return NextResponse.json(
        { error: 'You cannot change your own role' },
        { status: 400 }
      )
    }

    // Prevent demoting the last admin - check if target user is an admin and is the last one
    if (targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN') {
      const adminCount = await prisma.user.count({
        where: {
          organizationId,
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      })

      if (adminCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot change the role of the last administrator. At least one admin must remain.' },
          { status: 400 }
        )
      }
    }

    // Update user role
    const updatedUser = await prisma.user.update({
      where: { id: params.id },
      data: { role: role as UserRole },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user role:', error)

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
      { error: 'Failed to update user role' },
      { status: 500 }
    )
  }
}
