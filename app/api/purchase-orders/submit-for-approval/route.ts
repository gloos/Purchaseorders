import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

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
    const { purchaseOrderData } = body

    if (!purchaseOrderData) {
      return NextResponse.json({ error: 'Purchase order data is required' }, { status: 400 })
    }

    // Use a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the PO with PENDING_APPROVAL status
      const purchaseOrder = await tx.purchaseOrder.create({
        data: {
          ...purchaseOrderData,
          status: 'PENDING_APPROVAL',
          organizationId: user.organizationId!,
          createdById: user.id,
        },
        include: {
          lineItems: true,
          createdBy: true,
        },
      })

      // Create approval request
      const approvalRequest = await tx.approvalRequest.create({
        data: {
          purchaseOrderId: purchaseOrder.id,
          requesterId: user.id,
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

    // TODO: Send email notifications to all ADMINs
    // This will be implemented in the email notifications task

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
