// Expense Category Mappings API
// GET /api/expense-mappings - Get saved mappings for organization
// POST /api/expense-mappings - Save new category mappings

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { validateRequestBody, createExpenseMappingSchema, bulkExpenseMappingsSchema } from '@/lib/validations'
import * as Sentry from '@sentry/nextjs'

// GET - Retrieve all expense category mappings for the organization
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
      select: { organizationId: true }
    })

    if (!dbUser || !dbUser.organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // 3. Fetch all mappings for organization
    const mappings = await prisma.expenseCategoryMapping.findMany({
      where: { organizationId: dbUser.organizationId },
      orderBy: { keyword: 'asc' }
    })

    return NextResponse.json({ mappings })

  } catch (error) {
    console.error('Error fetching expense mappings:', error)
    Sentry.captureException(error)

    return NextResponse.json(
      { error: 'Failed to fetch expense mappings' },
      { status: 500 }
    )
  }
}

// POST - Create or update expense category mappings
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user's organization and check permissions
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        organizationId: true,
        role: true
      }
    })

    if (!dbUser || !dbUser.organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Only MANAGER, ADMIN, and SUPER_ADMIN can save mappings
    if (dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // 3. Parse and validate request body
    const body = await request.json()

    // Support both single mapping and bulk mappings
    let mappingsToSave: Array<{ keyword: string; freeAgentCategoryUrl: string }>

    if (body.mappings) {
      // Bulk mappings
      const validation = validateRequestBody(bulkExpenseMappingsSchema, body)
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.errors },
          { status: 400 }
        )
      }
      mappingsToSave = validation.data.mappings
    } else {
      // Single mapping
      const validation = validateRequestBody(createExpenseMappingSchema, body)
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: validation.errors },
          { status: 400 }
        )
      }
      mappingsToSave = [validation.data]
    }

    // 4. Upsert mappings (create or update)
    const results = await Promise.all(
      mappingsToSave.map(mapping =>
        prisma.expenseCategoryMapping.upsert({
          where: {
            organizationId_keyword: {
              organizationId: dbUser.organizationId!,
              keyword: mapping.keyword
            }
          },
          create: {
            organizationId: dbUser.organizationId!,
            keyword: mapping.keyword,
            freeAgentCategoryUrl: mapping.freeAgentCategoryUrl
          },
          update: {
            freeAgentCategoryUrl: mapping.freeAgentCategoryUrl
          }
        })
      )
    )

    return NextResponse.json({
      message: 'Mappings saved successfully',
      count: results.length,
      mappings: results
    }, { status: 201 })

  } catch (error) {
    console.error('Error saving expense mappings:', error)
    Sentry.captureException(error)

    return NextResponse.json(
      { error: 'Failed to save expense mappings' },
      { status: 500 }
    )
  }
}

// DELETE - Remove an expense category mapping
export async function DELETE(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Get user's organization and check permissions
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        organizationId: true,
        role: true
      }
    })

    if (!dbUser || !dbUser.organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Only MANAGER, ADMIN, and SUPER_ADMIN can delete mappings
    if (dbUser.role !== 'MANAGER' && dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // 3. Get keyword from query params
    const { searchParams } = new URL(request.url)
    const keyword = searchParams.get('keyword')

    if (!keyword) {
      return NextResponse.json(
        { error: 'Keyword parameter is required' },
        { status: 400 }
      )
    }

    // 4. Delete mapping
    await prisma.expenseCategoryMapping.delete({
      where: {
        organizationId_keyword: {
          organizationId: dbUser.organizationId,
          keyword: keyword.toLowerCase()
        }
      }
    })

    return NextResponse.json({ message: 'Mapping deleted successfully' })

  } catch (error) {
    console.error('Error deleting expense mapping:', error)
    Sentry.captureException(error)

    return NextResponse.json(
      { error: 'Failed to delete expense mapping' },
      { status: 500 }
    )
  }
}
