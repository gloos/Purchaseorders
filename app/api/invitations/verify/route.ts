// GET /api/invitations/verify?token=xxx - Verify invitation token
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import * as Sentry from '@sentry/nextjs'

export async function GET(request: NextRequest) {
  try {
    // 1. Get token from query params
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // 2. Find invitation by token
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        organization: {
          select: {
            name: true
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 })
    }

    // 3. Check if invitation is still valid
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Invitation has been ${invitation.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    // 4. Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      // Mark as expired
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' }
      })

      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // 5. Return invitation details
    return NextResponse.json({
      valid: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        organizationName: invitation.organization.name,
        expiresAt: invitation.expiresAt
      }
    })

  } catch (error) {
    console.error('Error verifying invitation:', error)
    Sentry.captureException(error)

    return NextResponse.json(
      { error: 'Failed to verify invitation' },
      { status: 500 }
    )
  }
}
