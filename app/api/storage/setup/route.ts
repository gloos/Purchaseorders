import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  try {
    // Create admin client at runtime
    const supabaseAdmin = createAdminClient()

    // Create company-logos bucket
    const { data: bucket, error: bucketError } = await supabaseAdmin.storage.createBucket('company-logos', {
      public: true,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp']
    })

    if (bucketError && !bucketError.message.includes('already exists')) {
      throw bucketError
    }

    return NextResponse.json({
      success: true,
      message: 'Storage bucket setup complete',
      bucket: bucket || 'already exists'
    })
  } catch (error) {
    console.error('Error setting up storage:', error)
    return NextResponse.json(
      { error: 'Failed to setup storage' },
      { status: 500 }
    )
  }
}
