import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET /api/approvals/pending
// Get pending approval requests assigned to the current user (ADMIN/SUPER_ADMIN only)
export async function GET() {
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

    // Only ADMIN and SUPER_ADMIN can view pending approvals
    if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get pending approval requests assigned to this user
    const pendingApprovals = await prisma.approvalRequest.findMany({
      where: {
        organizationId: user.organizationId,
        status: 'PENDING',
        approverId: user.id,
      },
      include: {
        purchaseOrder: {
          select: {
            id: true,
            poNumber: true,
            title: true,
            subtotalAmount: true,
            totalAmount: true,
            currency: true,
            supplierName: true,
            createdAt: true,
          },
        },
        requester: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Serialize Decimal types to strings to avoid client-side conversion issues
    const serializedApprovals = pendingApprovals.map(approval => ({
      ...approval,
      amount: approval.amount.toString(),
      createdAt: approval.createdAt.toISOString(),
      purchaseOrder: {
        ...approval.purchaseOrder,
        subtotalAmount: approval.purchaseOrder.subtotalAmount.toString(),
        totalAmount: approval.purchaseOrder.totalAmount.toString(),
        createdAt: approval.purchaseOrder.createdAt.toISOString(),
      },
    }))

    return NextResponse.json({
      approvals: serializedApprovals,
      count: serializedApprovals.length,
    })
  } catch (error) {
    console.error('Error fetching pending approvals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending approvals' },
      { status: 500 }
    )
  }
}
