import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resend } from '@/lib/resend/client'
import { PurchaseOrderEmail } from '@/lib/resend/templates/purchase-order-email'
import { renderAsync } from '@react-email/render'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { organizationId } = await getUserAndOrgOrThrow()

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

    if (!purchaseOrder.supplierEmail || purchaseOrder.supplierEmail.trim() === '') {
      return NextResponse.json({ error: 'Supplier email is required' }, { status: 400 })
    }

    // Get organization information
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Prepare email data - convert Decimal types to numbers
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
    const companyAddress = [
      organization.addressLine1,
      organization.addressLine2,
      organization.city,
      organization.region,
      organization.postcode,
      organization.country
    ].filter(Boolean).join(', ')

    // Render the email template
    const emailHtml = await renderAsync(
      PurchaseOrderEmail({
        poNumber: purchaseOrder.poNumber,
        supplierName: purchaseOrder.supplierName,
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
        companyLogoUrl: organization.logoUrl || undefined,
      })
    )

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: 'Purchase Orders <onboarding@resend.dev>', // Change this to your verified domain
      to: purchaseOrder.supplierEmail,
      subject: `Purchase Order #${purchaseOrder.poNumber}`,
      html: emailHtml,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 })
    }

    // Update purchase order to mark as sent
    await prisma.purchaseOrder.update({
      where: { id: purchaseOrder.id },
      data: {
        status: 'SENT',
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      emailId: data?.id,
      message: 'Purchase order sent successfully'
    })
  } catch (error) {
    console.error('Error sending purchase order email:', error)
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
