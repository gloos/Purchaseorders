import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/purchase-orders/[id]/audit-trail
// Get approval audit trail for a specific purchase order
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with organization
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
    })

    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'User not found or not in an organization' }, { status: 404 })
    }

    const poId = params.id

    // Verify PO belongs to user's organization
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      select: { organizationId: true },
    })

    if (!purchaseOrder || purchaseOrder.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    // Get approval request with all actions
    const approvalRequest = await prisma.approvalRequest.findUnique({
      where: { purchaseOrderId: poId },
      include: {
        actions: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!approvalRequest) {
      // No approval request for this PO (it was auto-approved or didn't need approval)
      return NextResponse.json({
        hasApprovalRequest: false,
        auditTrail: [],
      })
    }

    return NextResponse.json({
      hasApprovalRequest: true,
      approvalRequest: {
        id: approvalRequest.id,
        status: approvalRequest.status,
        amount: approvalRequest.amount,
        reason: approvalRequest.reason,
        createdAt: approvalRequest.createdAt,
        requester: approvalRequest.requester,
        approver: approvalRequest.approver,
      },
      auditTrail: approvalRequest.actions,
    })
  } catch (error) {
    console.error('Error fetching audit trail:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit trail' },
      { status: 500 }
    )
  }
}
