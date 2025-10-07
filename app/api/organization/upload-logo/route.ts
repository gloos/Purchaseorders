import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'

export async function POST(request: NextRequest) {
  try {
    const { organizationId } = await getUserAndOrgOrThrow()
    const supabase = await createClient()

    // Get the organization
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, logoUrl: true }
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get the file from the request
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only PNG, JPG, SVG, and WebP are allowed' }, { status: 400 })
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum size is 5MB' }, { status: 400 })
    }

    // Create unique file name
    const fileExt = file.name.split('.').pop()
    const fileName = `${organizationId}-${Date.now()}.${fileExt}`

    // Delete old logo if exists
    if (organization.logoUrl) {
      const oldFileName = organization.logoUrl.split('/').pop()
      if (oldFileName) {
        await supabase.storage
          .from('company-logos')
          .remove([oldFileName])
      }
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('company-logos')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('company-logos')
      .getPublicUrl(fileName)

    // Update organization with new logo URL
    await prisma.organization.update({
      where: { id: organizationId },
      data: {
        logoUrl: publicUrl
      }
    })

    return NextResponse.json({
      success: true,
      logoUrl: publicUrl
    })
  } catch (error) {
    console.error('Error uploading logo:', error)
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'No organization found') {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }
    }
    return NextResponse.json(
      { error: 'Failed to upload logo' },
      { status: 500 }
    )
  }
}
