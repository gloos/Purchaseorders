import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Find the purchase order by token
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { invoiceUploadToken: token },
      select: {
        id: true,
        poNumber: true,
        supplierName: true,
        totalAmount: true,
        currency: true,
        invoiceUploadTokenExpiresAt: true,
        invoiceUrl: true,
        invoiceReceivedAt: true,
      }
    })

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Invalid token. This upload link is not valid.' },
        { status: 404 }
      )
    }

    // Check if token has expired
    if (purchaseOrder.invoiceUploadTokenExpiresAt) {
      const now = new Date()
      if (now > purchaseOrder.invoiceUploadTokenExpiresAt) {
        return NextResponse.json(
          {
            error: 'This upload link has expired. Please contact the sender for a new link.',
            expiredAt: purchaseOrder.invoiceUploadTokenExpiresAt.toISOString()
          },
          { status: 410 }
        )
      }
    }

    // Check if invoice has already been uploaded
    if (purchaseOrder.invoiceUrl) {
      return NextResponse.json(
        {
          error: 'An invoice has already been uploaded for this purchase order.',
          uploadedAt: purchaseOrder.invoiceReceivedAt?.toISOString()
        },
        { status: 409 }
      )
    }

    // Return PO details for display
    return NextResponse.json({
      success: true,
      purchaseOrder: {
        poNumber: purchaseOrder.poNumber,
        supplierName: purchaseOrder.supplierName,
        totalAmount: purchaseOrder.totalAmount.toString(),
        currency: purchaseOrder.currency,
        expiresAt: purchaseOrder.invoiceUploadTokenExpiresAt?.toISOString()
      }
    })

  } catch (error) {
    console.error('Error validating token:', error)
    return NextResponse.json(
      { error: 'Failed to validate upload link' },
      { status: 500 }
    )
  }
}
