import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the user's organization
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      include: { organization: true }
    })

    if (!dbUser?.organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get all purchase orders for analytics
    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        organizationId: dbUser.organizationId
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        orderDate: true,
        createdAt: true,
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
        organizationId: dbUser.organizationId
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
      }))
    })
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
