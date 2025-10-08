// POST /api/auth/signup-invited - Complete signup with invitation token
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { acceptInvitationSchema, validateRequestBody } from '@/lib/validations'
import * as Sentry from '@sentry/nextjs'

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate request body
    const body = await request.json()
    const validation = validateRequestBody(acceptInvitationSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { token, name, password } = validation.data

    // 2. Find and validate invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token }
    })

    if (!invitation) {
      return NextResponse.json({ error: 'Invalid invitation token' }, { status: 404 })
    }

    // 3. Check invitation status
    if (invitation.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Invitation has been ${invitation.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    // 4. Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' }
      })

      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // 5. Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        email: invitation.email,
        organizationId: invitation.organizationId
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists in this organization' },
        { status: 409 }
      )
    }

    // 6. Create Supabase auth user
    const supabase = await createClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: invitation.email,
      password,
      options: {
        data: {
          name
        }
      }
    })

    if (authError || !authData.user) {
      console.error('Supabase signup error:', authError)
      return NextResponse.json(
        { error: authError?.message || 'Failed to create user account' },
        { status: 400 }
      )
    }

    // 7. Create app user record
    await prisma.user.create({
      data: {
        id: authData.user.id,
        email: invitation.email,
        name,
        role: invitation.role,
        organizationId: invitation.organizationId
      }
    })

    // 8. Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date()
      }
    })

    // 9. Return success
    return NextResponse.json({
      message: 'Account created successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error accepting invitation:', error)
    Sentry.captureException(error)

    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
