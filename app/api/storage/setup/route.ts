import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST() {
  try {
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
