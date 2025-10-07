import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { renderToStream } from '@react-pdf/renderer'
import { PurchaseOrderPDF } from '@/lib/pdf/templates/purchase-order-pdf'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { createElement } from 'react'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { user, organizationId } = await getUserAndOrgOrThrow()

    // Check permission to view POs
    const { requirePermission } = await import('@/lib/rbac')
    requirePermission(user.role, 'canViewPO')

    // Get the purchase order with line items
    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id: params.id,
        organizationId
      },
      include: {
        lineItems: true
      }
    })

    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    // Get organization information
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Prepare PDF data - convert Decimal types to numbers
    const items = purchaseOrder.lineItems.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice.toString()),
      total: parseFloat(item.totalPrice.toString())
    }))

    // Use tax data from the purchase order
    const subtotal = parseFloat(purchaseOrder.subtotalAmount.toString())
    const tax = parseFloat(purchaseOrder.taxAmount.toString())
    const total = parseFloat(purchaseOrder.totalAmount.toString())
    const currency = purchaseOrder.currency
    const taxMode = purchaseOrder.taxMode
    const taxRate = parseFloat(purchaseOrder.taxRate.toString())

    // Prepare company information
    const companyAddress = [
      organization.addressLine1,
      organization.addressLine2,
      organization.city,
      organization.region,
      organization.postcode,
      organization.country
    ].filter(Boolean).join(', ')

    // Generate PDF
    const stream = await renderToStream(
      createElement(PurchaseOrderPDF, {
        poNumber: purchaseOrder.poNumber,
        supplierName: purchaseOrder.supplierName,
        supplierEmail: purchaseOrder.supplierEmail || undefined,
        supplierPhone: purchaseOrder.supplierPhone || undefined,
        supplierAddress: purchaseOrder.supplierAddress || undefined,
        orderDate: purchaseOrder.orderDate.toISOString(),
        deliveryDate: purchaseOrder.deliveryDate?.toISOString(),
        items,
        currency,
        subtotal,
        taxMode,
        taxRate,
        tax,
        total,
        notes: purchaseOrder.notes || undefined,
        terms: undefined,
        companyName: organization.name,
        companyAddress: companyAddress || undefined,
        companyPhone: organization.phone || undefined,
        companyEmail: organization.email || undefined,
        companyVatNumber: organization.vatNumber || undefined,
        companyRegistrationNumber: organization.companyRegistrationNumber || undefined,
      }) as any
    )

    // Convert stream to buffer
    const chunks: Uint8Array[] = []
    for await (const chunk of stream as any) {
      chunks.push(chunk)
    }
    const buffer = Buffer.concat(chunks)

    // Return PDF with proper headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="PO-${purchaseOrder.poNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)

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
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
