import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createAdminClient } from '@/lib/supabase/admin'
import { checkRateLimit, getIdentifier, addRateLimitHeaders } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - prevent DoS attacks via file uploads
    const identifier = getIdentifier(request)
    const rateLimit = await checkRateLimit('api', identifier)

    const headers = new Headers()
    addRateLimitHeaders(headers, rateLimit)

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400, headers }
      )
    }

    // Find and validate the purchase order by token
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { invoiceUploadToken: token },
      select: {
        id: true,
        poNumber: true,
        organizationId: true,
        invoiceUploadTokenExpiresAt: true,
        invoiceUrl: true,
      }
    })

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Invalid token. This upload link is not valid.' },
        { status: 404, headers }
      )
    }

    // Check if token has expired
    if (purchaseOrder.invoiceUploadTokenExpiresAt) {
      const now = new Date()
      if (now > purchaseOrder.invoiceUploadTokenExpiresAt) {
        return NextResponse.json(
          { error: 'This upload link has expired. Please contact the sender for a new link.' },
          { status: 410, headers }
        )
      }
    }

    // Check if invoice has already been uploaded
    if (purchaseOrder.invoiceUrl) {
      return NextResponse.json(
        { error: 'An invoice has already been uploaded for this purchase order.' },
        { status: 409, headers }
      )
    }

    // Get the file from the request
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400, headers }
      )
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF, PNG, and JPG files are allowed.' },
        { status: 400, headers }
      )
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400, headers }
      )
    }

    // Create unique file name
    const timestamp = Date.now()
    const fileExt = file.name.split('.').pop()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${purchaseOrder.organizationId}/${purchaseOrder.id}-${timestamp}-${sanitizedFileName}`

    // Upload to Supabase Storage using admin client
    const supabaseAdmin = createAdminClient()

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('supplier-invoices')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Failed to upload file. Please try again.' },
        { status: 500, headers }
      )
    }

    // Update purchase order with invoice details and invalidate token
    await prisma.purchaseOrder.update({
      where: { id: purchaseOrder.id },
      data: {
        invoiceUrl: fileName, // Store the path, not the full URL
        invoiceReceivedAt: new Date(),
        status: 'INVOICED',
        invoiceUploadToken: null, // Invalidate the token
        invoiceUploadTokenExpiresAt: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Invoice uploaded successfully',
      poNumber: purchaseOrder.poNumber
    }, { headers })

  } catch (error) {
    console.error('Error uploading invoice:', error)
    return NextResponse.json(
      { error: 'Failed to upload invoice. Please try again.' },
      { status: 500 }
    )
  }
}
