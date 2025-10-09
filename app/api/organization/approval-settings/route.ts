// GET /api/organization/approval-settings - Get approval workflow settings
// PUT /api/organization/approval-settings - Update approval workflow settings
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { validateRequestBody } from '@/lib/validations'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'

const approvalSettingsSchema = z.object({
  approvalThreshold: z.number().min(0).max(1000000),
  autoApproveAdmin: z.boolean()
})

// GET - Retrieve approval settings for organization
export async function GET() {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user's organization
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true }
    })

    if (!dbUser || !dbUser.organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // 3. Fetch organization approval settings
    const organization = await prisma.organization.findUnique({
      where: { id: dbUser.organizationId },
      select: {
        approvalThreshold: true,
        autoApproveAdmin: true
      }
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    return NextResponse.json({
      approvalThreshold: organization.approvalThreshold ? Number(organization.approvalThreshold) : 50,
      autoApproveAdmin: organization.autoApproveAdmin ?? true
    })

  } catch (error) {
    console.error('Error fetching approval settings:', error)
    Sentry.captureException(error)

    return NextResponse.json(
      { error: 'Failed to fetch approval settings' },
      { status: 500 }
    )
  }
}

// PUT - Update approval settings (ADMIN/SUPER_ADMIN only)
export async function PUT(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user with role check
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        organizationId: true,
        role: true
      }
    })

    if (!dbUser || !dbUser.organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // 3. Check permissions - only ADMIN and SUPER_ADMIN can update settings
    if (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only Admins can update approval settings.' },
        { status: 403 }
      )
    }

    // 4. Parse and validate request body
    const body = await request.json()
    const validation = validateRequestBody(approvalSettingsSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { approvalThreshold, autoApproveAdmin } = validation.data

    // 5. Update organization settings
    const updatedOrg = await prisma.organization.update({
      where: { id: dbUser.organizationId },
      data: {
        approvalThreshold,
        autoApproveAdmin
      },
      select: {
        approvalThreshold: true,
        autoApproveAdmin: true
      }
    })

    return NextResponse.json({
      message: 'Approval settings updated successfully',
      approvalThreshold: Number(updatedOrg.approvalThreshold),
      autoApproveAdmin: updatedOrg.autoApproveAdmin
    })

  } catch (error) {
    console.error('Error updating approval settings:', error)
    Sentry.captureException(error)

    return NextResponse.json(
      { error: 'Failed to update approval settings' },
      { status: 500 }
    )
  }
}
