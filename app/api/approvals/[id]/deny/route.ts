import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/approvals/[id]/deny
// Deny a pending approval request (ADMIN/SUPER_ADMIN only)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user with role check
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      include: { organization: true },
    })

    if (!user || !user.organizationId) {
      return NextResponse.json({ error: 'User not found or not in an organization' }, { status: 404 })
    }

    // Only ADMIN and SUPER_ADMIN can deny
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const approvalId = params.id
    const body = await request.json()
    const { reason } = body // Optional denial reason

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get approval request with PO
      const approvalRequest = await tx.approvalRequest.findUnique({
        where: { id: approvalId },
        include: {
          purchaseOrder: true,
          requester: true,
        },
      })

      if (!approvalRequest) {
        throw new Error('Approval request not found')
      }

      // Verify it belongs to the same organization
      if (approvalRequest.organizationId !== user.organizationId) {
        throw new Error('Approval request not found in your organization')
      }

      // Check if already processed
      if (approvalRequest.status !== 'PENDING') {
        throw new Error(`This request has already been ${approvalRequest.status.toLowerCase()}`)
      }

      // Update approval request
      const updatedApproval = await tx.approvalRequest.update({
        where: { id: approvalId },
        data: {
          status: 'DENIED',
          approverId: user.id,
          reason: reason || null,
        },
      })

      // Update PO status to DRAFT (editable and resubmittable)
      const updatedPO = await tx.purchaseOrder.update({
        where: { id: approvalRequest.purchaseOrderId },
        data: {
          status: 'DRAFT',
        },
      })

      // Create approval action for audit trail
      await tx.approvalAction.create({
        data: {
          approvalRequestId: approvalId,
          userId: user.id,
          action: 'DENIED',
          reason: reason || null,
        },
      })

      return {
        approvalRequest: updatedApproval,
        purchaseOrder: updatedPO,
        requester: approvalRequest.requester,
      }
    })

    // TODO: Send email notification to requester with denial reason
    // This will be implemented in the email notifications task

    return NextResponse.json({
      success: true,
      approvalRequest: result.approvalRequest,
      purchaseOrder: result.purchaseOrder,
    })
  } catch (error: any) {
    console.error('Error denying request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to deny request' },
      { status: 500 }
    )
  }
}
