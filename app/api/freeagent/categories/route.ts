// GET /api/freeagent/categories - Fetch expense categories from FreeAgent
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { FreeAgentClient } from '@/lib/freeagent/client'
import * as Sentry from '@sentry/nextjs'

export async function GET() {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user's organization
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { organization: true }
    })

    if (!dbUser || !dbUser.organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const organization = dbUser.organization

    // 3. Check if FreeAgent is connected
    if (!organization?.freeAgentAccessToken) {
      return NextResponse.json(
        { error: 'FreeAgent not connected. Please authorize first.' },
        { status: 400 }
      )
    }

    // 4. Check if token needs refresh
    let accessToken = organization.freeAgentAccessToken
    if (organization.freeAgentTokenExpiry && new Date() >= new Date(organization.freeAgentTokenExpiry)) {
      // Token expired, refresh it
      if (!organization.freeAgentRefreshToken) {
        return NextResponse.json(
          { error: 'FreeAgent token expired. Please reconnect FreeAgent in settings.' },
          { status: 400 }
        )
      }

      const tokens = await FreeAgentClient.refreshAccessToken(
        organization.freeAgentRefreshToken,
        process.env.FREEAGENT_CLIENT_ID!,
        process.env.FREEAGENT_CLIENT_SECRET!
      )

      accessToken = tokens.access_token
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

      // Update tokens in database
      await prisma.organization.update({
        where: { id: organization.id },
        data: {
          freeAgentAccessToken: tokens.access_token,
          freeAgentRefreshToken: tokens.refresh_token,
          freeAgentTokenExpiry: expiresAt
        }
      })
    }

    // 5. Initialize FreeAgent client with fresh token
    const freeAgentClient = new FreeAgentClient(accessToken)

    // 6. Fetch categories
    const categories = await freeAgentClient.getCategories(true)

    // 7. Return formatted categories
    return NextResponse.json({
      categories: {
        adminExpenses: categories.admin_expenses_categories,
        costOfSales: categories.cost_of_sales_categories,
        income: categories.income_categories,
        general: categories.general_categories
      }
    })

  } catch (error) {
    console.error('Error fetching FreeAgent categories:', error)
    Sentry.captureException(error)

    // Provide more specific error message
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch categories from FreeAgent'

    return NextResponse.json(
      {
        error: 'Failed to fetch categories from FreeAgent',
        details: errorMessage
      },
      { status: 500 }
    )
  }
}
