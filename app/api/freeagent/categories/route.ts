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

    // 4. Initialize FreeAgent client
    const freeAgentClient = new FreeAgentClient(
      organization.freeAgentAccessToken,
      organization.freeAgentRefreshToken || undefined
    )

    // 5. Fetch categories
    const categories = await freeAgentClient.getCategories(true)

    // 6. Return formatted categories
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
