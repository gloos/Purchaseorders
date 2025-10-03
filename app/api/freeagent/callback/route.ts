import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { FreeAgentClient } from '@/lib/freeagent/client'
import { NextResponse } from 'next/server'

// GET /api/freeagent/callback - Handle FreeAgent OAuth callback
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const origin = url.origin

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.redirect(new URL('/signin?error=unauthorized', origin))
    }

    const code = url.searchParams.get('code')
    const error = url.searchParams.get('error')

    if (error) {
      return NextResponse.redirect(new URL(`/dashboard?error=freeagent_${error}`, origin))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/dashboard?error=no_code', origin))
    }

    const clientId = process.env.FREEAGENT_CLIENT_ID!
    const clientSecret = process.env.FREEAGENT_CLIENT_SECRET!
    const redirectUri = process.env.FREEAGENT_REDIRECT_URI!

    // Exchange code for tokens
    const tokens = await FreeAgentClient.getAccessToken(
      code,
      redirectUri,
      clientId,
      clientSecret
    )

    // Get user's organization
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true }
    })

    if (!dbUser?.organizationId) {
      return NextResponse.redirect(new URL('/dashboard?error=no_organization', origin))
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    // Store tokens in organization
    await prisma.organization.update({
      where: { id: dbUser.organizationId },
      data: {
        freeAgentAccessToken: tokens.access_token,
        freeAgentRefreshToken: tokens.refresh_token,
        freeAgentTokenExpiry: expiresAt
      }
    })

    return NextResponse.redirect(new URL('/dashboard?success=freeagent_connected', origin))
  } catch (error) {
    console.error('Error handling FreeAgent callback:', error)
    const url = new URL(request.url)
    return NextResponse.redirect(new URL('/dashboard?error=freeagent_callback_failed', url.origin))
  }
}
