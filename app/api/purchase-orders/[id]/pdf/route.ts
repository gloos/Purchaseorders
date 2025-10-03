import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { renderToStream } from '@react-pdf/renderer'
import { PurchaseOrderPDF } from '@/lib/pdf/templates/purchase-order-pdf'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the user's organization
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      include: { organization: true }
    })

    if (!dbUser?.organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get the purchase order with line items
    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id: params.id,
        organizationId: dbUser.organizationId
      },
      include: {
        lineItems: true
      }
    })

    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    // Prepare PDF data - convert Decimal types to numbers
    const items = purchaseOrder.lineItems.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: parseFloat(item.unitPrice.toString()),
      total: parseFloat(item.totalPrice.toString())
    }))

    // Calculate subtotal from line items
    const subtotal = items.reduce((sum, item) => sum + item.total, 0)
    const tax = subtotal * 0.20 // UK VAT rate
    const total = subtotal + tax

    // Prepare company information
    const organization = dbUser.organization
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
      PurchaseOrderPDF({
        poNumber: purchaseOrder.poNumber,
        supplierName: purchaseOrder.supplierName,
        supplierEmail: purchaseOrder.supplierEmail || undefined,
        supplierPhone: purchaseOrder.supplierPhone || undefined,
        supplierAddress: purchaseOrder.supplierAddress || undefined,
        orderDate: purchaseOrder.orderDate.toISOString(),
        deliveryDate: purchaseOrder.deliveryDate?.toISOString(),
        items,
        subtotal,
        tax,
        total,
        notes: purchaseOrder.notes || undefined,
        terms: undefined,
        // Company information
        companyName: organization.name,
        companyAddress: companyAddress || undefined,
        companyPhone: organization.phone || undefined,
        companyEmail: organization.email || undefined,
        companyVatNumber: organization.vatNumber || undefined,
        companyRegistrationNumber: organization.companyRegistrationNumber || undefined,
      })
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
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
