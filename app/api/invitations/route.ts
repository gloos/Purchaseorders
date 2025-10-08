// POST /api/invitations - Create a new invitation
// GET /api/invitations - List invitations for the organization
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { createInvitationSchema, validateRequestBody } from '@/lib/validations'
import { sendInvitationEmail } from '@/lib/email/invitation'
import * as Sentry from '@sentry/nextjs'

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user with organization
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { organization: true }
    })

    if (!dbUser || !dbUser.organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // 3. Check permissions - only MANAGER and ADMIN can invite users
    if (dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only Managers and Admins can invite users.' },
        { status: 403 }
      )
    }

    // 4. Parse and validate request body
    const body = await request.json()
    const validation = validateRequestBody(createInvitationSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { email, role } = validation.data

    // 5. Check if user already exists in the organization
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        organizationId: dbUser.organizationId
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists in your organization' },
        { status: 409 }
      )
    }

    // 6. Check if there's already a pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email,
        organizationId: dbUser.organizationId,
        status: 'PENDING',
        expiresAt: { gt: new Date() }
      }
    })

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An active invitation already exists for this email' },
        { status: 409 }
      )
    }

    // 7. Create invitation (expires in 7 days)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invitation = await prisma.invitation.create({
      data: {
        email,
        role,
        organizationId: dbUser.organizationId,
        invitedById: dbUser.id,
        expiresAt
      }
    })

    // 8. Send invitation email
    try {
      await sendInvitationEmail({
        to: email,
        inviterName: dbUser.name || dbUser.email,
        organizationName: dbUser.organization?.name || 'your organization',
        invitationToken: invitation.token,
        role
      })
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      Sentry.captureException(emailError)
      // Don't fail the request if email fails, just log it
    }

    // 9. Return success
    return NextResponse.json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating invitation:', error)
    Sentry.captureException(error)

    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    )
  }
}

export async function GET(_request: NextRequest) {
  try {
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

    // 3. Check permissions - only MANAGER and ADMIN can view invitations
    if (dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only Managers and Admins can view invitations.' },
        { status: 403 }
      )
    }

    // 4. Get invitations for the organization
    const invitations = await prisma.invitation.findMany({
      where: {
        organizationId: dbUser.organizationId
      },
      include: {
        invitedBy: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // 5. Return invitations
    return NextResponse.json({
      invitations: invitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        status: inv.status,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        acceptedAt: inv.acceptedAt,
        invitedBy: {
          name: inv.invitedBy.name || inv.invitedBy.email,
          email: inv.invitedBy.email
        }
      }))
    })

  } catch (error) {
    console.error('Error fetching invitations:', error)
    Sentry.captureException(error)

    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}
