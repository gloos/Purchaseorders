import { createClient } from '@/lib/supabase/server'
import { FreeAgentClient } from '@/lib/freeagent/client'
import { NextResponse } from 'next/server'

// GET /api/freeagent/authorize - Redirect to FreeAgent OAuth
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clientId = process.env.FREEAGENT_CLIENT_ID!
    const redirectUri = process.env.FREEAGENT_REDIRECT_URI!

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: 'FreeAgent credentials not configured' },
        { status: 500 }
      )
    }

    const authUrl = FreeAgentClient.getAuthorizationUrl(redirectUri, clientId)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error('Error initiating FreeAgent OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate FreeAgent authorization' },
      { status: 500 }
    )
  }
}
