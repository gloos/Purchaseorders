import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { checkRateLimit, getIdentifier, addRateLimitHeaders } from '@/lib/rate-limit'
import { sendPOToSupplier } from '@/lib/email/send-po-to-supplier'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, organizationId } = await getUserAndOrgOrThrow()

    // Check permission to send POs
    const { requirePermission } = await import('@/lib/rbac')
    requirePermission(user.role, 'canSendPO')

    // Apply rate limiting (5 emails per minute per user)
    const identifier = getIdentifier(request, user.id)
    const rateLimitResult = await checkRateLimit('email', identifier)

    if (!rateLimitResult.success) {
      const headers = new Headers()
      addRateLimitHeaders(headers, rateLimitResult)
      return NextResponse.json(
        {
          error: 'Too many email requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        },
        { status: 429, headers }
      )
    }

    // Verify PO exists and belongs to organization
    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id: params.id,
        organizationId
      }
    })

    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    if (!purchaseOrder.supplierEmail || purchaseOrder.supplierEmail.trim() === '') {
      return NextResponse.json({ error: 'Supplier email is required' }, { status: 400 })
    }

    // Send PO to supplier using shared function
    const emailId = await sendPOToSupplier(params.id)

    // Update purchase order to mark as sent
    await prisma.purchaseOrder.update({
      where: { id: purchaseOrder.id },
      data: {
        status: 'SENT',
        updatedAt: new Date()
      }
    })

    // Add rate limit headers to success response
    const headers = new Headers()
    addRateLimitHeaders(headers, rateLimitResult)

    return NextResponse.json({
      success: true,
      emailId,
      message: 'Purchase order sent successfully'
    }, { headers })
  } catch (error) {
    console.error('Error sending purchase order email:', error)

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
      { error: 'Failed to send purchase order email' },
      { status: 500 }
    )
  }
}
