import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { organizationId } = await getUserAndOrgOrThrow()

    // Get the purchase order
    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id: params.id,
        organizationId
      },
      select: {
        invoiceUrl: true,
        poNumber: true
      }
    })

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Purchase order not found' },
        { status: 404 }
      )
    }

    if (!purchaseOrder.invoiceUrl) {
      return NextResponse.json(
        { error: 'No invoice has been uploaded for this purchase order' },
        { status: 404 }
      )
    }

    // Download the file from Supabase storage
    const supabaseAdmin = createAdminClient()

    const { data, error } = await supabaseAdmin.storage
      .from('supplier-invoices')
      .download(purchaseOrder.invoiceUrl)

    if (error || !data) {
      console.error('Error downloading invoice:', error)
      return NextResponse.json(
        { error: 'Failed to download invoice' },
        { status: 500 }
      )
    }

    // Determine file extension from the stored path
    const fileExt = purchaseOrder.invoiceUrl.split('.').pop()?.toLowerCase() || 'pdf'

    // Set appropriate content type
    const contentTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg'
    }
    const contentType = contentTypes[fileExt] || 'application/octet-stream'

    // Convert blob to buffer
    const buffer = Buffer.from(await data.arrayBuffer())

    // Return the file with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="Invoice-${purchaseOrder.poNumber}.${fileExt}"`,
        'Content-Length': buffer.length.toString(),
      },
    })

  } catch (error) {
    console.error('Error fetching invoice:', error)

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'No organization found') {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch invoice' },
      { status: 500 }
    )
  }
}
