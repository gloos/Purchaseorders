import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { z } from 'zod'
import * as Sentry from '@sentry/nextjs'

// GET /api/projects/[id] - Get single project with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { organizationId } = await getUserAndOrgOrThrow()

    const project = await prisma.project.findFirst({
      where: {
        id,
        organizationId
      },
      include: {
        purchaseOrders: {
          orderBy: { createdAt: 'desc' },
          include: {
            lineItems: true
          }
        },
        teamMembers: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        },
        milestones: {
          orderBy: { dueDate: 'asc' }
        },
        documents: {
          orderBy: { uploadedAt: 'desc' },
          include: {
            uploadedBy: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Convert Decimal fields to strings for JSON serialization
    const serializedProject = {
      ...project,
      budget: project.budget?.toString() || null,
      totalRevenue: project.totalRevenue.toString(),
      totalCosts: project.totalCosts.toString(),
      totalPoValue: project.totalPoValue.toString(),
      profitAmount: project.profitAmount.toString(),
      profitMargin: project.profitMargin.toString(),
      purchaseOrders: project.purchaseOrders.map(po => ({
        ...po,
        subtotalAmount: po.subtotalAmount.toString(),
        taxRate: po.taxRate.toString(),
        taxAmount: po.taxAmount.toString(),
        totalAmount: po.totalAmount.toString(),
        lineItems: po.lineItems.map(item => ({
          ...item,
          unitPrice: item.unitPrice.toString(),
          totalPrice: item.totalPrice.toString()
        }))
      }))
    }

    return NextResponse.json(serializedProject)
  } catch (error) {
    console.error('Error fetching project:', error)
    Sentry.captureException(error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

// PATCH /api/projects/[id] - Update project
const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED', 'HIDDEN', 'ON_HOLD']).optional(),
  budget: z.number().positive().optional(),
  budgetAlertThreshold: z.number().min(0).max(100).optional(),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { organizationId, user } = await getUserAndOrgOrThrow()

    // Check permission
    const { requirePermission } = await import('@/lib/rbac')
    requirePermission(user.role, 'canCreatePO')

    const body = await request.json()

    const validation = updateProjectSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    // Check project exists and belongs to org
    const existing = await prisma.project.findFirst({
      where: { id, organizationId }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // Handle status changes
    const data = validation.data
    const updateData: any = {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined
    }

    if (data.status === 'COMPLETED' && !existing.completedAt) {
      updateData.completedAt = new Date()
    } else if (data.status === 'CANCELLED' && !existing.cancelledAt) {
      updateData.cancelledAt = new Date()
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData
    })

    // Convert Decimal fields to strings
    const serializedProject = {
      ...project,
      budget: project.budget?.toString() || null,
      totalRevenue: project.totalRevenue.toString(),
      totalCosts: project.totalCosts.toString(),
      totalPoValue: project.totalPoValue.toString(),
      profitAmount: project.profitAmount.toString(),
      profitMargin: project.profitMargin.toString()
    }

    return NextResponse.json(serializedProject)
  } catch (error) {
    console.error('Error updating project:', error)
    Sentry.captureException(error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

// DELETE /api/projects/[id] - Delete project (soft delete by setting HIDDEN)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { organizationId, user } = await getUserAndOrgOrThrow()

    // Only admins can delete projects
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    await prisma.project.update({
      where: {
        id,
        organizationId
      },
      data: {
        status: 'HIDDEN'
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting project:', error)
    Sentry.captureException(error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}
