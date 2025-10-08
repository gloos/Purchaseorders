import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import * as Sentry from '@sentry/nextjs'

// GET /api/projects - List projects with filters
export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await getUserAndOrgOrThrow()
    const searchParams = request.nextUrl.searchParams

    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const clientId = searchParams.get('clientId')
    const sortBy = searchParams.get('sortBy') || 'name'
    const sortOrder = searchParams.get('sortOrder') || 'asc'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: any = {
      organizationId,
      ...(status && { status }),
      ...(clientId && { clientFreeAgentId: clientId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { code: { contains: search, mode: 'insensitive' } },
          { clientName: { contains: search, mode: 'insensitive' } }
        ]
      })
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          purchaseOrders: {
            select: {
              id: true,
              totalAmount: true,
              status: true
            }
          },
          teamMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.project.count({ where })
    ])

    // Calculate aggregated stats
    const projectsWithStats = projects.map(project => {
      const poStats = project.purchaseOrders.reduce((acc, po) => {
        const amount = new Decimal(po.totalAmount.toString())
        acc.totalPoValue = acc.totalPoValue.add(amount)
        acc.poCount++
        if (po.status === 'SENT' || po.status === 'APPROVED' || po.status === 'INVOICED') {
          acc.committedValue = acc.committedValue.add(amount)
        }
        return acc
      }, {
        totalPoValue: new Decimal(0),
        committedValue: new Decimal(0),
        poCount: 0
      })

      // Calculate budget usage
      const budgetUsage = project.budget
        ? poStats.totalPoValue.div(project.budget.toString()).mul(100).toNumber()
        : null

      // Determine health status
      let healthStatus = 'UNKNOWN'
      if (project.budget) {
        const threshold = project.budgetAlertThreshold || 75
        if (budgetUsage! > 100 || project.profitMargin.toNumber() < 0) {
          healthStatus = 'CRITICAL'
        } else if (budgetUsage! > threshold || project.profitMargin.toNumber() < 10) {
          healthStatus = 'WARNING'
        } else {
          healthStatus = 'HEALTHY'
        }
      }

      return {
        ...project,
        poCount: poStats.poCount,
        totalPoValue: poStats.totalPoValue.toString(),
        committedValue: poStats.committedValue.toString(),
        budgetUsage,
        healthStatus,
        // Convert Decimal fields to strings for JSON serialization
        budget: project.budget?.toString() || null,
        totalRevenue: project.totalRevenue.toString(),
        totalCosts: project.totalCosts.toString(),
        profitAmount: project.profitAmount.toString(),
        profitMargin: project.profitMargin.toString()
      }
    })

    return NextResponse.json({
      projects: projectsWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching projects:', error)
    Sentry.captureException(error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

// POST /api/projects - Create manual project (if not synced from FreeAgent)
const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  code: z.string().optional(),
  description: z.string().optional(),
  budget: z.number().positive().optional(),
  budgetAlertThreshold: z.number().min(0).max(100).optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

export async function POST(request: NextRequest) {
  try {
    const { organizationId, user } = await getUserAndOrgOrThrow()

    // Check permission to create projects
    const { requirePermission } = await import('@/lib/rbac')
    requirePermission(user.role, 'canCreatePO') // Using canCreatePO permission for now

    const body = await request.json()

    const validation = createProjectSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const data = validation.data
    const project = await prisma.project.create({
      data: {
        name: data.name,
        code: data.code,
        description: data.description,
        budget: data.budget,
        budgetAlertThreshold: data.budgetAlertThreshold,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        organizationId
      }
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    console.error('Error creating project:', error)
    Sentry.captureException(error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}
