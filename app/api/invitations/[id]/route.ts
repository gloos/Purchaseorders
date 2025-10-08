// DELETE /api/invitations/[id] - Cancel an invitation
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user with organization
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (!dbUser || !dbUser.organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // 3. Check permissions - only MANAGER and ADMIN can cancel invitations
    if (dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only Managers and Admins can cancel invitations.' },
        { status: 403 }
      )
    }

    // 4. Get invitation
    const invitation = await prisma.invitation.findUnique({
      where: { id }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }

    // 5. Verify invitation belongs to user's organization
    if (invitation.organizationId !== dbUser.organizationId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // 6. Cancel invitation
    await prisma.invitation.update({
      where: { id },
      data: {
        status: 'CANCELLED'
      }
    })

    // 7. Return success
    return NextResponse.json({
      message: 'Invitation cancelled successfully'
    })

  } catch (error) {
    console.error('Error cancelling invitation:', error)
    Sentry.captureException(error)

    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
      { status: 500 }
    )
  }
}
