import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { sendApprovalRequestEmail } from '@/lib/email/approval-notifications'
import { generatePONumber } from '@/lib/counter-helpers'
import { createPurchaseOrderSchema, validateRequestBody } from '@/lib/validations'
import { calculateTax } from '@/lib/tax-helpers'
import * as Sentry from '@sentry/nextjs'

// POST /api/purchase-orders/submit-for-approval
// Submit a PO for approval (for MANAGER role when PO >= threshold)
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with organization
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { organization: true },
    })

    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'User not found or not in an organization' }, { status: 404 })
    }

    const body = await request.json()
    const { purchaseOrderData, approverId } = body

    if (!purchaseOrderData) {
      return NextResponse.json({ error: 'Purchase order data is required' }, { status: 400 })
    }

    if (!approverId) {
      return NextResponse.json({ error: 'Approver selection is required' }, { status: 400 })
    }

    // Validate and transform purchase order data (including date conversion)
    const validation = validateRequestBody(createPurchaseOrderSchema, purchaseOrderData)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { lineItems, ...poData } = validation.data

    // Calculate tax and totals using tax helper
    // IMPORTANT: taxRate is snapshotted from the selected TaxRate at creation time
    // This preserves accounting integrity - if the TaxRate is later modified, this PO remains unchanged
    const taxMode = poData.taxMode || 'EXCLUSIVE'
    const taxRate = poData.taxRate || 0
    const { subtotalAmount, taxAmount, totalAmount } = calculateTax(lineItems, taxMode, taxRate)

    // Validate that the selected approver is an admin in the organization
    const approver = await prisma.user.findFirst({
      where: {
        id: approverId,
        organizationId: user.organizationId!,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] }
      }
    })

    if (!approver) {
      return NextResponse.json({ error: 'Invalid approver selected' }, { status: 400 })
    }

    // Generate PO number if not provided (atomic, race-condition safe)
    const poNumber = poData.poNumber || await generatePONumber(user.organizationId!)

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the PO with PENDING_APPROVAL status
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          ...poData,
          poNumber,
          subtotalAmount,
          taxAmount,
          totalAmount,
          status: 'PENDING_APPROVAL',
          organizationId: user.organizationId!,
          createdById: user.id,
          lineItems: {
            create: lineItems.map((item) => ({
              description: item.description,
              quantity: item.quantity,
              unitPrice: typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice,
              totalPrice: typeof item.unitPrice === 'string'
                ? parseFloat(item.unitPrice) * item.quantity
                : item.unitPrice * item.quantity,
              notes: item.notes,
            })),
          },
        },
        include: {
          lineItems: true,
          createdBy: true,
        },
      })

      // Create approval request assigned to selected approver
      const approvalRequest = await tx.approvalRequest.create({
        data: {
          purchaseOrderId: purchaseOrder.id,
          requesterId: user.id,
          approverId: approverId,
          organizationId: user.organizationId!,
          amount: purchaseOrder.subtotalAmount,
          status: 'PENDING',
        },
      })

      // Create approval action for audit trail
      await tx.approvalAction.create({
        data: {
          approvalRequestId: approvalRequest.id,
          userId: user.id,
          action: 'SUBMITTED',
        },
      })

      return { purchaseOrder, approvalRequest }
    })

    // Send email notification to the selected approver
    try {
      await sendApprovalRequestEmail({
        to: [approver.email],
        poNumber: result.purchaseOrder.poNumber,
        poTitle: result.purchaseOrder.title,
        amount: result.purchaseOrder.subtotalAmount.toString(),
        currency: result.purchaseOrder.currency,
        requesterName: user.name || user.email,
        supplierName: result.purchaseOrder.supplierName,
        poId: result.purchaseOrder.id
      })
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error('Failed to send approval request email:', emailError)
      Sentry.captureException(emailError)
    }

    return NextResponse.json({
      purchaseOrder: result.purchaseOrder,
      approvalRequest: result.approvalRequest,
    }, { status: 201 })
  } catch (error) {
    console.error('Error submitting PO for approval:', error)
    return NextResponse.json(
      { error: 'Failed to submit purchase order for approval' },
      { status: 500 }
    )
  }
}
