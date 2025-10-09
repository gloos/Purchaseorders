import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generatePONumber } from '@/lib/counter-helpers'
import { createPurchaseOrderSchema, validateRequestBody } from '@/lib/validations'
import { calculateTax } from '@/lib/tax-helpers'

// GET /api/purchase-orders - List all purchase orders for user's organization
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { organization: true }
    })

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        organizationId: dbUser.organizationId,
        ...(status && { status: status as any })
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        lineItems: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(purchaseOrders)
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
      { status: 500 }
    )
  }
}

// POST /api/purchase-orders - Create a new purchase order
export async function POST(request: Request) {
  try {
    const { getUserAndOrgOrThrow } = await import('@/lib/auth-helpers')
    const { user, organizationId } = await getUserAndOrgOrThrow()

    // Check permission to create POs
    const { requirePermission } = await import('@/lib/rbac')
    requirePermission(user.role, 'canCreatePO')

    const body = await request.json()

    // Validate request body
    const validation = validateRequestBody(createPurchaseOrderSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { lineItems, ...poData } = validation.data

    // Safety check for lineItems
    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      console.error('Line items validation issue:', { lineItems, body })
      return NextResponse.json(
        { error: 'Line items are required. Please add at least one item.' },
        { status: 400 }
      )
    }

    // Generate PO number if not provided (atomic, race-condition safe)
    const poNumber = poData.poNumber || await generatePONumber(organizationId)

    // Date conversion is now handled by Zod validation schema

    // Calculate tax and totals using tax helper
    // IMPORTANT: taxRate is snapshotted from the selected TaxRate at creation time
    // This preserves accounting integrity - if the TaxRate is later modified, this PO remains unchanged
    const taxMode = poData.taxMode || 'EXCLUSIVE'
    const taxRate = poData.taxRate || 0
    const { subtotalAmount, taxAmount, totalAmount } = calculateTax(lineItems, taxMode, taxRate)

    // --- APPROVAL WORKFLOW VALIDATION ---
    // Prevent MANAGER users from bypassing the approval workflow by directly calling this endpoint
    // instead of /api/purchase-orders/submit-for-approval
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { approvalThreshold: true, autoApproveAdmin: true }
    })

    const threshold = organization?.approvalThreshold ? Number(organization.approvalThreshold) : 50
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN'
    const autoApprove = organization?.autoApproveAdmin ?? true

    // A non-admin user is trying to directly create a PO over the threshold
    if (!isAdmin && subtotalAmount >= threshold) {
      return NextResponse.json(
        { error: `Purchase orders of ${subtotalAmount} or more require approval. Please submit for approval instead.` },
        { status: 403 }
      )
    }

    // An admin is creating a PO but auto-approval is disabled
    if (isAdmin && !autoApprove && subtotalAmount >= threshold) {
      return NextResponse.json(
        { error: `This organization requires all POs over the threshold to go through the approval workflow.` },
        { status: 403 }
      )
    }
    // --- END APPROVAL WORKFLOW VALIDATION ---

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        ...poData,
        poNumber,
        subtotalAmount,
        taxAmount,
        totalAmount,
        organizationId,
        createdById: user.id,
        lineItems: {
          create: lineItems.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * parseFloat(item.unitPrice),
            notes: item.notes
          }))
        }
      },
      include: {
        lineItems: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(purchaseOrder, { status: 201 })
  } catch (error) {
    console.error('Error creating purchase order:', error)

    // Import AuthorizationError
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
      { error: 'Failed to create purchase order' },
      { status: 500 }
    )
  }
}
