import { createClient } from '@/lib/supabase/server'
import { FreeAgentClient } from '@/lib/freeagent/client'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getIdentifier, addRateLimitHeaders } from '@/lib/rate-limit'

// GET /api/freeagent/authorize - Redirect to FreeAgent OAuth
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Apply rate limiting to prevent authorization flow abuse
    const identifier = getIdentifier(request, user.id)
    const rateLimitResult = await checkRateLimit('freeagent', identifier)

    if (!rateLimitResult.success) {
      const headers = new Headers()
      addRateLimitHeaders(headers, rateLimitResult)
      return NextResponse.json(
        {
          error: 'Too many authorization requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        },
        { status: 429, headers }
      )
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
