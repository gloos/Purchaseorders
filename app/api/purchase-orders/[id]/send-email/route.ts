import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { resend } from '@/lib/resend/client'
import { PurchaseOrderEmail } from '@/lib/resend/templates/purchase-order-email'
import { renderAsync } from '@react-email/render'

export async function POST(
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

    if (!purchaseOrder.supplierEmail) {
      return NextResponse.json({ error: 'Supplier email not provided' }, { status: 400 })
    }

    // Prepare email data
    const items = purchaseOrder.lineItems.map(item => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total
    }))

    // Render the email template
    const emailHtml = await renderAsync(
      PurchaseOrderEmail({
        poNumber: purchaseOrder.poNumber,
        supplierName: purchaseOrder.supplierName,
        orderDate: purchaseOrder.orderDate.toISOString(),
        deliveryDate: purchaseOrder.deliveryDate?.toISOString(),
        items,
        subtotal: purchaseOrder.subtotal,
        tax: purchaseOrder.tax,
        total: purchaseOrder.total,
        notes: purchaseOrder.notes || undefined,
        terms: purchaseOrder.terms || undefined,
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
    return NextResponse.json(
      { error: 'Failed to send purchase order email' },
      { status: 500 }
    )
  }
}
