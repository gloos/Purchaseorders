import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'

export async function GET() {
  try {
    const { organizationId } = await getUserAndOrgOrThrow()

    // Get all purchase orders for analytics
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        organizationId
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        orderDate: true,
        createdAt: true,
        supplierName: true,
        freeAgentBillId: true,
        freeAgentBillCreatedAt: true,
      }
    })

    // Calculate analytics
    const totalPOs = purchaseOrders.length
    const totalValue = purchaseOrders.reduce((sum, po) =>
      sum + parseFloat(po.totalAmount.toString()), 0
    )

    // Count by status
    const statusCounts = purchaseOrders.reduce((acc, po) => {
      acc[po.status] = (acc[po.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Get POs by month for the last 6 months
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const posByMonth = purchaseOrders
      .filter(po => new Date(po.orderDate) >= sixMonthsAgo)
      .reduce((acc, po) => {
        const month = new Date(po.orderDate).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short'
        })
        if (!acc[month]) {
          acc[month] = { count: 0, value: 0 }
        }
        acc[month].count++
        acc[month].value += parseFloat(po.totalAmount.toString())
        return acc
      }, {} as Record<string, { count: number; value: number }>)

    // Convert to array and sort by date
    const monthlyData = Object.entries(posByMonth).map(([month, data]) => ({
      month,
      count: data.count,
      value: data.value
    })).sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())

    // Get recent activity (last 10 POs)
    const recentActivity = await prisma.purchaseOrder.findMany({
      where: {
        organizationId
      },
      select: {
        id: true,
        poNumber: true,
        title: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        supplierName: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })

    // 1. Bills ready to create (INVOICED without FreeAgent bill)
    const billsReadyToCreate = purchaseOrders.filter(
      po => po.status === 'INVOICED' && !po.freeAgentBillId
    )
    const billsReadyCount = billsReadyToCreate.length
    const billsReadyValue = billsReadyToCreate.reduce(
      (sum, po) => sum + parseFloat(po.totalAmount.toString()), 0
    )

    // 2. Supplier spending breakdown (top 5)
    const supplierSpending = purchaseOrders.reduce((acc, po) => {
      const supplier = po.supplierName || 'Unknown Supplier'
      if (!acc[supplier]) {
        acc[supplier] = 0
      }
      acc[supplier] += parseFloat(po.totalAmount.toString())
      return acc
    }, {} as Record<string, number>)

    const topSuppliers = Object.entries(supplierSpending)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)

    // 3. Outstanding amounts by status
    const outstandingAmounts = {
      invoiced: purchaseOrders
        .filter(po => po.status === 'INVOICED')
        .reduce((sum, po) => sum + parseFloat(po.totalAmount.toString()), 0),
      sent: purchaseOrders
        .filter(po => po.status === 'SENT')
        .reduce((sum, po) => sum + parseFloat(po.totalAmount.toString()), 0),
      pendingApproval: purchaseOrders
        .filter(po => po.status === 'PENDING_APPROVAL')
        .reduce((sum, po) => sum + parseFloat(po.totalAmount.toString()), 0)
    }

    // 9. FreeAgent sync status
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const billsCreatedThisMonth = purchaseOrders.filter(
      po => po.freeAgentBillCreatedAt && new Date(po.freeAgentBillCreatedAt) >= startOfMonth
    ).length

    const lastBillSync = purchaseOrders
      .filter(po => po.freeAgentBillCreatedAt)
      .sort((a, b) =>
        new Date(b.freeAgentBillCreatedAt!).getTime() - new Date(a.freeAgentBillCreatedAt!).getTime()
      )[0]?.freeAgentBillCreatedAt || null

    // Check organization for FreeAgent connection
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { freeAgentAccessToken: true }
    })

    const freeAgentSync = {
      isConnected: !!organization?.freeAgentAccessToken,
      billsCreatedThisMonth,
      lastSync: lastBillSync
    }

    return NextResponse.json({
      summary: {
        totalPOs,
        totalValue,
        statusCounts
      },
      monthlyData,
      recentActivity: recentActivity.map(po => ({
        ...po,
        totalAmount: parseFloat(po.totalAmount.toString())
      })),
      billsReady: {
        count: billsReadyCount,
        value: billsReadyValue
      },
      topSuppliers,
      outstandingAmounts,
      freeAgentSync
    })
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error)
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'No organization found') {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }
    }
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
