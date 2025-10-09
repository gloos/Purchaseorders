import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { sendApprovalGrantedEmail } from '@/lib/email/approval-notifications'
import * as Sentry from '@sentry/nextjs'

// POST /api/approvals/[id]/approve
// Approve a pending approval request (ADMIN/SUPER_ADMIN only)
export async function POST(
  _request: NextRequest,
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

    // Only ADMIN and SUPER_ADMIN can approve
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const approvalId = params.id

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Get approval request with PO
      const approvalRequest = await tx.approvalRequest.findUnique({
        where: { id: approvalId },
        include: {
          purchaseOrder: {
            include: {
              lineItems: true,
            },
          },
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
          status: 'APPROVED',
          approverId: user.id,
        },
      })

      // Update PO status to SENT (auto-send after approval)
      const updatedPO = await tx.purchaseOrder.update({
        where: { id: approvalRequest.purchaseOrderId },
        data: {
          status: 'SENT',
        },
      })

      // Create approval action for audit trail
      await tx.approvalAction.create({
        data: {
          approvalRequestId: approvalId,
          userId: user.id,
          action: 'APPROVED',
        },
      })

      return {
        approvalRequest: updatedApproval,
        purchaseOrder: updatedPO,
        requester: approvalRequest.requester,
        poNumber: approvalRequest.purchaseOrder.poNumber,
        poTitle: approvalRequest.purchaseOrder.title,
      }
    })

    // Send email notification to requester
    try {
      await sendApprovalGrantedEmail({
        to: result.requester.email,
        poNumber: result.poNumber,
        poTitle: result.poTitle,
        approverName: user.name || user.email,
        poId: result.purchaseOrder.id
      })
    } catch (emailError) {
      // Log email error but don't fail the request
      console.error('Failed to send approval granted email:', emailError)
      Sentry.captureException(emailError)
    }

    return NextResponse.json({
      success: true,
      approvalRequest: result.approvalRequest,
      purchaseOrder: result.purchaseOrder,
    })
  } catch (error: any) {
    console.error('Error approving request:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to approve request' },
      { status: 500 }
    )
  }
}
