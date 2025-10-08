// POST /api/purchase-orders/[id]/create-bill - Create FreeAgent bill from invoiced PO
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { FreeAgentClient } from '@/lib/freeagent/client'
import {
  matchOrCreateContact,
  transformPOToBill,
  checkBillExists,
  retryWithBackoff,
  extractIdFromUrl
} from '@/lib/freeagent/bill-service'
import { validateRequestBody, createBillSchema } from '@/lib/validations'
import * as Sentry from '@sentry/nextjs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poId } = await params

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

    // 3. Check permissions - only MANAGER and ADMIN can create bills
    if (dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only Managers and Admins can create bills.' },
        { status: 403 }
      )
    }

    const organization = dbUser.organization

    // 4. Check FreeAgent connection
    if (!organization?.freeAgentAccessToken) {
      return NextResponse.json(
        { error: 'FreeAgent not connected. Please authorize first.' },
        { status: 400 }
      )
    }

    // 5. Parse and validate request body
    const body = await request.json()
    const validation = validateRequestBody(createBillSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { categoryMappings, paymentTermsDays, dueDate, contactUrl } = validation.data

    // 6. Check for existing bill (idempotency)
    const existingBill = await checkBillExists(poId)
    if (existingBill.exists) {
      return NextResponse.json(
        {
          error: 'Bill already exists for this purchase order',
          billUrl: existingBill.billUrl
        },
        { status: 409 }
      )
    }

    // 7. Get PO with line items
    const po = await prisma.purchaseOrder.findUnique({
      where: {
        id: poId,
        organizationId: dbUser.organizationId // Ensure PO belongs to user's org
      },
      include: {
        lineItems: true
      }
    })

    if (!po) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    // 8. Validate PO status is INVOICED
    if (po.status !== 'INVOICED') {
      return NextResponse.json(
        {
          error: 'Purchase order must have INVOICED status',
          currentStatus: po.status
        },
        { status: 400 }
      )
    }

    // 9. Check if token needs refresh
    let accessToken = organization.freeAgentAccessToken
    if (organization.freeAgentTokenExpiry && new Date() >= new Date(organization.freeAgentTokenExpiry)) {
      // Token expired, refresh it
      if (!organization.freeAgentRefreshToken) {
        return NextResponse.json(
          { error: 'FreeAgent token expired. Please reconnect FreeAgent in settings.' },
          { status: 400 }
        )
      }

      const tokens = await FreeAgentClient.refreshAccessToken(
        organization.freeAgentRefreshToken,
        process.env.FREEAGENT_CLIENT_ID!,
        process.env.FREEAGENT_CLIENT_SECRET!
      )

      accessToken = tokens.access_token
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

      // Update tokens in database
      await prisma.organization.update({
        where: { id: organization.id },
        data: {
          freeAgentAccessToken: tokens.access_token,
          freeAgentRefreshToken: tokens.refresh_token,
          freeAgentTokenExpiry: expiresAt
        }
      })
    }

    // 10. Initialize FreeAgent client with fresh token
    const freeAgentClient = new FreeAgentClient(accessToken)

    // 11. Match or create contact
    let finalContactUrl: string

    if (contactUrl) {
      // Use provided contact URL
      finalContactUrl = contactUrl
    } else if (po.freeAgentContactUrl) {
      // Use cached contact URL
      finalContactUrl = po.freeAgentContactUrl
    } else {
      // Match or create contact
      const contact = await matchOrCreateContact(freeAgentClient, po)
      finalContactUrl = contact.url

      // Cache the contact URL for future use
      await prisma.purchaseOrder.update({
        where: { id: poId },
        data: { freeAgentContactUrl: contact.url }
      })
    }

    // 12. Transform PO to bill format
    const billData = await transformPOToBill(
      po,
      finalContactUrl,
      categoryMappings,
      dueDate,
      paymentTermsDays
    )

    // 13. Create bill in FreeAgent with retry logic
    const bill = await retryWithBackoff(
      async () => await freeAgentClient.createBill(billData),
      3, // max retries
      1000 // initial delay ms
    )

    // 14. Update PO with bill information
    await prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        freeAgentBillId: extractIdFromUrl(bill.url!),
        freeAgentBillUrl: bill.url,
        freeAgentBillCreatedAt: new Date(),
        paymentTermsDays: paymentTermsDays || po.paymentTermsDays
      }
    })

    // 15. Return success response
    return NextResponse.json({
      message: 'Bill created successfully in FreeAgent',
      bill: {
        id: extractIdFromUrl(bill.url!),
        url: bill.url,
        reference: bill.reference,
        total: bill.total_value,
        dueDate: bill.due_on
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating FreeAgent bill:', error)
    Sentry.captureException(error, {
      extra: {
        poId: (await params).id,
        userId: (await (await createClient()).auth.getUser()).data.user?.id
      }
    })

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Missing category mapping')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }

      if (error.message.includes('FreeAgent API error')) {
        return NextResponse.json(
          { error: 'FreeAgent API error. Please check your connection and try again.' },
          { status: 502 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create bill in FreeAgent' },
      { status: 500 }
    )
  }
}

// GET /api/purchase-orders/[id]/create-bill - Check if bill can be created
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: poId } = await params

    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        organizationId: true,
        role: true,
        organization: {
          select: {
            freeAgentAccessToken: true
          }
        }
      }
    })

    if (!dbUser || !dbUser.organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // 3. Get PO
    const po = await prisma.purchaseOrder.findUnique({
      where: {
        id: poId,
        organizationId: dbUser.organizationId
      },
      select: {
        status: true,
        freeAgentBillId: true,
        freeAgentBillUrl: true,
        freeAgentBillCreatedAt: true
      }
    })

    if (!po) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    // 4. Check eligibility
    const canCreate = (
      (dbUser.role === 'MANAGER' || dbUser.role === 'ADMIN') &&
      po.status === 'INVOICED' &&
      !po.freeAgentBillId &&
      !!dbUser.organization?.freeAgentAccessToken
    )

    return NextResponse.json({
      canCreate,
      reasons: {
        hasPermission: dbUser.role === 'MANAGER' || dbUser.role === 'ADMIN',
        isInvoiced: po.status === 'INVOICED',
        noBillExists: !po.freeAgentBillId,
        freeAgentConnected: !!dbUser.organization?.freeAgentAccessToken
      },
      existingBill: po.freeAgentBillId ? {
        id: po.freeAgentBillId,
        url: po.freeAgentBillUrl,
        createdAt: po.freeAgentBillCreatedAt
      } : null
    })

  } catch (error) {
    console.error('Error checking bill eligibility:', error)
    Sentry.captureException(error)

    return NextResponse.json(
      { error: 'Failed to check bill eligibility' },
      { status: 500 }
    )
  }
}
