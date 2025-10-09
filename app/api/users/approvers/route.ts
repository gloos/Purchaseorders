import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'

// GET /api/users/approvers - Get list of users who can approve POs (ADMIN and SUPER_ADMIN)
export async function GET() {
  try {
    const { organizationId } = await getUserAndOrgOrThrow()

    // Get all admins and super admins in the organization
    const approvers = await prisma.user.findMany({
      where: {
        organizationId,
        role: {
          in: ['ADMIN', 'SUPER_ADMIN']
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      },
      orderBy: [
        { role: 'desc' }, // SUPER_ADMIN first
        { name: 'asc' }
      ]
    })

    return NextResponse.json({ approvers })
  } catch (error) {
    console.error('Error fetching approvers:', error)

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'No organization found') {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch approvers' },
      { status: 500 }
    )
  }
}
