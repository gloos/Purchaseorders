import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'

const batchUpdateSchema = z.object({
  projectIds: z.array(z.string()).min(1),
  operation: z.enum(['updateStatus', 'assignTeamMember', 'updateBudgetAlert']),
  data: z.record(z.any())
})

export async function PATCH(request: NextRequest) {
  try {
    const { organizationId, user } = await getUserAndOrgOrThrow()

    // Check permission
    const { requirePermission } = await import('@/lib/rbac')
    requirePermission(user.role, 'canCreatePO')

    const body = await request.json()

    const validation = batchUpdateSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { projectIds, operation, data } = validation.data

    // Verify all projects belong to organization
    const projects = await prisma.project.findMany({
      where: {
        id: { in: projectIds },
        organizationId
      }
    })

    if (projects.length !== projectIds.length) {
      return NextResponse.json(
        { error: 'Some projects not found or unauthorized' },
        { status: 404 }
      )
    }

    let result: any

    switch (operation) {
      case 'updateStatus':
        const status = data.status as 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'HIDDEN' | 'ON_HOLD'
        const updateData: any = { status }

        if (status === 'COMPLETED') {
          updateData.completedAt = new Date()
        } else if (status === 'CANCELLED') {
          updateData.cancelledAt = new Date()
        }

        result = await prisma.project.updateMany({
          where: {
            id: { in: projectIds },
            organizationId
          },
          data: updateData
        })
        break

      case 'assignTeamMember':
        const userId = data.userId as string
        const role = data.role as string

        // Create team member assignments
        const assignments = projectIds.map(projectId => ({
          projectId,
          userId,
          role
        }))

        result = await prisma.projectTeamMember.createMany({
          data: assignments,
          skipDuplicates: true
        })
        break

      case 'updateBudgetAlert':
        const threshold = data.threshold as number
        result = await prisma.project.updateMany({
          where: {
            id: { in: projectIds },
            organizationId
          },
          data: {
            budgetAlertThreshold: threshold
          }
        })
        break

      default:
        return NextResponse.json(
          { error: 'Invalid operation' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      updated: result.count || projectIds.length,
      projectIds
    })
  } catch (error) {
    console.error('Error in batch update:', error)
    Sentry.captureException(error)
    return NextResponse.json(
      { error: 'Failed to update projects' },
      { status: 500 }
    )
  }
}
