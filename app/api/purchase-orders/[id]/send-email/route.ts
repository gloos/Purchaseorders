import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { resend } from '@/lib/resend/client'
import { PurchaseOrderEmail } from '@/lib/resend/templates/purchase-order-email'
import { renderAsync } from '@react-email/render'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { renderToStream } from '@react-pdf/renderer'
import { PurchaseOrderPDF } from '@/lib/pdf/templates/purchase-order-pdf'
import { checkRateLimit, getIdentifier, addRateLimitHeaders } from '@/lib/rate-limit'
import { randomUUID } from 'crypto'
import { createElement } from 'react'

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

    // Generate invoice upload token if not already present
    let invoiceUploadToken = purchaseOrder.invoiceUploadToken
    if (!invoiceUploadToken || !purchaseOrder.invoiceUploadTokenExpiresAt) {
      invoiceUploadToken = randomUUID()
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 90) // 90-day expiry

      await prisma.purchaseOrder.update({
        where: { id: purchaseOrder.id },
        data: {
          invoiceUploadToken,
          invoiceUploadTokenExpiresAt: expiresAt
        }
      })
    }

    // Render the email template
    const emailHtml = await renderAsync(
      createElement(PurchaseOrderEmail, {
        poNumber: purchaseOrder.poNumber,
        supplierName: purchaseOrder.supplierName,
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
        // Company information
        companyName: organization.name,
        companyAddress: companyAddress || undefined,
        companyPhone: organization.phone || undefined,
        companyEmail: organization.email || undefined,
        companyVatNumber: organization.vatNumber || undefined,
        companyRegistrationNumber: organization.companyRegistrationNumber || undefined,
        companyLogoUrl: organization.logoUrl || undefined,
        // Invoice upload token
        invoiceUploadToken,
      }) as any
    )

    // Generate plain text version
    const emailText = `
Purchase Order #${purchaseOrder.poNumber}

Supplier: ${purchaseOrder.supplierName}
Order Date: ${new Date(purchaseOrder.orderDate).toLocaleDateString()}
${purchaseOrder.deliveryDate ? `Requested Delivery Date: ${new Date(purchaseOrder.deliveryDate).toLocaleDateString()}` : ''}

LINE ITEMS:
${items.map(item => `${item.description} - Qty: ${item.quantity} - Unit Price: ${currency} ${item.unitPrice.toFixed(2)} - Total: ${currency} ${item.total.toFixed(2)}`).join('\n')}

Subtotal: ${currency} ${subtotal.toFixed(2)}
${taxMode !== 'NONE' && taxRate > 0 ? `Tax (${taxRate.toFixed(2)}% ${taxMode === 'INCLUSIVE' ? 'incl.' : 'excl.'}): ${currency} ${tax.toFixed(2)}` : ''}
Total: ${currency} ${total.toFixed(2)}

${purchaseOrder.notes ? `\nNotes:\n${purchaseOrder.notes}` : ''}

---
${organization.name}
${companyAddress || ''}
${organization.phone || ''}
${organization.email || ''}
`.trim()

    // Generate PDF attachment
    const pdfStream = await renderToStream(
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
        // Company information
        companyName: organization.name,
        companyAddress: companyAddress || undefined,
        companyPhone: organization.phone || undefined,
        companyEmail: organization.email || undefined,
        companyVatNumber: organization.vatNumber || undefined,
        companyRegistrationNumber: organization.companyRegistrationNumber || undefined,
      }) as any
    )

    // Convert PDF stream to buffer
    const pdfChunks: Uint8Array[] = []
    for await (const chunk of pdfStream as any) {
      pdfChunks.push(chunk)
    }
    const pdfBuffer = Buffer.concat(pdfChunks)

    // Send email via Resend with PDF attachment
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'Purchase Orders <onboarding@resend.dev>'
    const replyToEmail = process.env.RESEND_REPLY_TO_EMAIL

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: purchaseOrder.supplierEmail,
      ...(replyToEmail && { reply_to: replyToEmail }),
      subject: `Purchase Order #${purchaseOrder.poNumber}`,
      html: emailHtml,
      text: emailText,
      attachments: [
        {
          filename: `PO-${purchaseOrder.poNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
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

    // Add rate limit headers to success response
    const headers = new Headers()
    addRateLimitHeaders(headers, rateLimitResult)

    return NextResponse.json({
      success: true,
      emailId: data?.id,
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
