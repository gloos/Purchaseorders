import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { Decimal } from '@prisma/client/runtime/library'
import * as Sentry from '@sentry/nextjs'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { organizationId } = await getUserAndOrgOrThrow()

    const project = await prisma.project.findFirst({
      where: { id, organizationId },
      include: {
        purchaseOrders: {
          include: {
            lineItems: true
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

    // Calculate detailed analytics
    const analytics = calculateProjectAnalytics(project)

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('Error calculating project analytics:', error)
    Sentry.captureException(error)
    return NextResponse.json(
      { error: 'Failed to calculate analytics' },
      { status: 500 }
    )
  }
}

function calculateProjectAnalytics(project: any) {
  const now = new Date()

  // PO Analysis
  const poAnalysis = project.purchaseOrders.reduce((acc: any, po: any) => {
    const amount = new Decimal(po.totalAmount.toString())

    acc.totalPoValue = acc.totalPoValue.add(amount)
    acc.poCount++

    // Status breakdown
    if (!acc.byStatus[po.status]) {
      acc.byStatus[po.status] = { count: 0, value: new Decimal(0) }
    }
    acc.byStatus[po.status].count++
    acc.byStatus[po.status].value = acc.byStatus[po.status].value.add(amount)

    // Committed vs Pending
    if (['SENT', 'APPROVED', 'INVOICED'].includes(po.status)) {
      acc.committedValue = acc.committedValue.add(amount)
    } else {
      acc.pendingValue = acc.pendingValue.add(amount)
    }

    // Monthly breakdown
    const month = po.createdAt.toISOString().slice(0, 7)
    if (!acc.byMonth[month]) {
      acc.byMonth[month] = { count: 0, value: new Decimal(0) }
    }
    acc.byMonth[month].count++
    acc.byMonth[month].value = acc.byMonth[month].value.add(amount)

    // Supplier breakdown
    if (!acc.bySupplier[po.supplierName]) {
      acc.bySupplier[po.supplierName] = { count: 0, value: new Decimal(0) }
    }
    acc.bySupplier[po.supplierName].count++
    acc.bySupplier[po.supplierName].value = acc.bySupplier[po.supplierName].value.add(amount)

    return acc
  }, {
    totalPoValue: new Decimal(0),
    committedValue: new Decimal(0),
    pendingValue: new Decimal(0),
    poCount: 0,
    byStatus: {},
    byMonth: {},
    bySupplier: {}
  })

  // Budget Analysis
  const budgetAnalysis: any = {
    budget: project.budget?.toString() || null,
    spent: poAnalysis.totalPoValue.toString(),
    committed: poAnalysis.committedValue.toString(),
    available: null,
    percentUsed: null,
    percentCommitted: null,
    isOverBudget: false,
    projectedOverrun: null
  }

  if (project.budget) {
    const budget = new Decimal(project.budget.toString())
    budgetAnalysis.available = budget.minus(poAnalysis.committedValue).toString()
    budgetAnalysis.percentUsed = poAnalysis.totalPoValue.div(budget).mul(100).toNumber()
    budgetAnalysis.percentCommitted = poAnalysis.committedValue.div(budget).mul(100).toNumber()
    budgetAnalysis.isOverBudget = budgetAnalysis.percentUsed > 100

    // Project overrun based on run rate
    if (project.startDate && project.endDate) {
      const projectDuration = project.endDate.getTime() - project.startDate.getTime()
      const elapsed = now.getTime() - project.startDate.getTime()
      const percentComplete = (elapsed / projectDuration) * 100

      if (percentComplete > 0 && percentComplete < 100) {
        const runRate = poAnalysis.totalPoValue.div(percentComplete).mul(100)
        budgetAnalysis.projectedOverrun = runRate.minus(budget).toString()
      }
    }
  }

  // Profitability Analysis
  const profitability = {
    revenue: project.totalRevenue.toString(),
    costs: poAnalysis.totalPoValue.toString(),
    profit: new Decimal(project.totalRevenue.toString()).minus(poAnalysis.totalPoValue).toString(),
    margin: null,
    projectedProfit: null,
    projectedMargin: null
  }

  const revenueDecimal = new Decimal(project.totalRevenue.toString())
  if (revenueDecimal.gt(0)) {
    profitability.margin = new Decimal(profitability.profit)
      .div(revenueDecimal)
      .mul(100)
      .toNumber()
  }

  // Timeline Analysis
  const timeline: any = {
    startDate: project.startDate,
    endDate: project.endDate,
    duration: null,
    elapsed: null,
    remaining: null,
    percentComplete: null,
    isOverdue: false,
    daysOverdue: null
  }

  if (project.startDate && project.endDate) {
    timeline.duration = Math.ceil(
      (project.endDate.getTime() - project.startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (project.startDate <= now) {
      timeline.elapsed = Math.ceil(
        (now.getTime() - project.startDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      timeline.percentComplete = (timeline.elapsed / timeline.duration) * 100
    }

    if (project.endDate < now && project.status === 'ACTIVE') {
      timeline.isOverdue = true
      timeline.daysOverdue = Math.ceil(
        (now.getTime() - project.endDate.getTime()) / (1000 * 60 * 60 * 24)
      )
    } else {
      timeline.remaining = Math.ceil(
        (project.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
    }
  }

  // Top suppliers
  const topSuppliers = Object.entries(poAnalysis.bySupplier)
    .map(([name, data]: [string, any]) => ({
      name,
      count: data.count,
      value: data.value.toString()
    }))
    .sort((a, b) => new Decimal(b.value).minus(new Decimal(a.value)).toNumber())
    .slice(0, 5)

  // Monthly trend
  const monthlyTrend = Object.entries(poAnalysis.byMonth)
    .map(([month, data]: [string, any]) => ({
      month,
      count: data.count,
      value: data.value.toString()
    }))
    .sort((a, b) => a.month.localeCompare(b.month))

  return {
    summary: {
      totalPoValue: poAnalysis.totalPoValue.toString(),
      poCount: poAnalysis.poCount,
      committedValue: poAnalysis.committedValue.toString(),
      pendingValue: poAnalysis.pendingValue.toString(),
      avgPoValue: poAnalysis.poCount > 0
        ? poAnalysis.totalPoValue.div(poAnalysis.poCount).toString()
        : '0'
    },
    budget: budgetAnalysis,
    profitability,
    timeline,
    topSuppliers,
    monthlyTrend,
    statusBreakdown: Object.entries(poAnalysis.byStatus).map(([status, data]: [string, any]) => ({
      status,
      count: data.count,
      value: data.value.toString()
    }))
  }
}
