'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card } from '@/components/ui/Card'
import { MetricCard } from '@/components/ui/MetricCard'
import { StatusBadge } from '@/components/ui/Badge'

// Dynamically import ApprovalWidget with client-side only rendering
const ApprovalWidget = dynamic(
  () => import('@/components/approval-widget').then(mod => mod.ApprovalWidget),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Pending Approvals
        </h3>
        <div className="text-center text-slate-600 dark:text-slate-400 py-4">
          Loading...
        </div>
      </div>
    )
  }
)

interface DashboardAnalytics {
  summary: {
    totalPOs: number
    totalValue: number
    statusCounts: Record<string, number>
  }
  monthlyData: Array<{
    month: string
    count: number
    value: number
  }>
  recentActivity: Array<{
    id: string
    poNumber: string
    title: string
    status: string
    totalAmount: number
    createdAt: string
    supplierName: string
  }>
  billsReady: {
    count: number
    value: number
  }
  topSuppliers: Array<{
    name: string
    value: number
  }>
  outstandingAmounts: {
    invoiced: number
    sent: number
    pendingApproval: number
  }
  freeAgentSync: {
    isConnected: boolean
    billsCreatedThisMonth: number
    lastSync: string | null
  }
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#9ca3af',
  PENDING_APPROVAL: '#fbbf24',
  APPROVED: '#34d399',
  SENT: '#60a5fa',
  RECEIVED: '#a78bfa',
  INVOICED: '#14b8a6',
  CANCELLED: '#f87171'
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  SENT: 'Sent',
  RECEIVED: 'Received',
  INVOICED: 'Invoiced',
  CANCELLED: 'Cancelled'
}

export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userRoleLoading, setUserRoleLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
    fetchUserRole()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/analytics')
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
      // Note: 401 errors are now handled by middleware redirects
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUserRole = async () => {
    try {
      setUserRoleLoading(true)
      const response = await fetch('/api/me')
      if (response.ok) {
        const data = await response.json()
        setUserRole(data.role)
      }
    } catch (error) {
      console.error('Error fetching user role:', error)
    } finally {
      setUserRoleLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
      </div>
    )
  }

  const statusData = analytics ? Object.entries(analytics.summary.statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    color: STATUS_COLORS[status] || '#9ca3af'
  })) : []

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Dashboard</h1>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <MetricCard
          title="Total Purchase Orders"
          value={analytics?.summary.totalPOs || 0}
          iconColor="blue"
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />

        <MetricCard
          title="Total Value"
          value={`£${(analytics?.summary.totalValue || 0).toFixed(2)}`}
          iconColor="green"
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <MetricCard
          title="Pending"
          value={(analytics?.summary.statusCounts.PENDING_APPROVAL || 0) + (analytics?.summary.statusCounts.DRAFT || 0)}
          iconColor="yellow"
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        <MetricCard
          title="Bills Ready to Create"
          value={analytics?.billsReady.count || 0}
          subtitle={`£${(analytics?.billsReady.value || 0).toFixed(2)}`}
          iconColor="teal"
          icon={
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      </div>

      {/* Outstanding Amounts */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 mb-8">
        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Pending Approval
              </p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-2">
                £{(analytics?.outstandingAmounts.pendingApproval || 0).toFixed(2)}
              </p>
            </div>
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Sent (Committed)
              </p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-2">
                £{(analytics?.outstandingAmounts.sent || 0).toFixed(2)}
              </p>
            </div>
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                Invoiced (Awaiting Payment)
              </p>
              <p className="text-2xl font-semibold text-slate-900 dark:text-white mt-2">
                £{(analytics?.outstandingAmounts.invoiced || 0).toFixed(2)}
              </p>
            </div>
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3 mb-8">
        {/* Status Distribution Chart */}
        <Card padding="md">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">PO Status Distribution</h2>
              {statusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500 dark:text-slate-400">
              No data available
            </div>
          )}
        </Card>

        {/* Monthly Trends Chart */}
        <Card padding="md">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Monthly PO Trends</h2>
              {analytics && analytics.monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" fill="#60a5fa" name="Number of POs" />
                  </BarChart>
                </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500 dark:text-slate-400">
              No data available
            </div>
          )}
        </Card>

        {/* Top Suppliers Chart */}
        <Card padding="md">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Top 5 Suppliers</h2>
              {analytics && analytics.topSuppliers.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.topSuppliers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip formatter={(value) => `£${Number(value).toFixed(2)}`} />
                    <Bar dataKey="value" fill="#34d399" name="Total Spend" />
                  </BarChart>
                </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500 dark:text-slate-400">
              No data available
            </div>
          )}
        </Card>
      </div>

      {/* FreeAgent Sync Status */}
      {analytics?.freeAgentSync.isConnected && (
        <Card padding="md" className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">FreeAgent Sync Status</h2>
              <div className="flex items-center gap-6 mt-4">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Bills Created This Month</p>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-white">{analytics.freeAgentSync.billsCreatedThisMonth}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Last Sync</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {analytics.freeAgentSync.lastSync
                      ? new Date(analytics.freeAgentSync.lastSync).toLocaleString()
                      : 'Never'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 bg-emerald-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Connected</span>
            </div>
          </div>
        </Card>
      )}

      {/* Approval Widget - Dynamically loaded client-side only */}
      {!userRoleLoading && (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') && (
        <div className="mb-8">
          <ApprovalWidget />
        </div>
      )}

      {/* Recent Activity */}
      <Card padding="none">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Activity</h2>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {analytics && analytics.recentActivity.length > 0 ? (
            analytics.recentActivity.map((po) => (
              <Link
                key={po.id}
                href={`/purchase-orders/${po.id}`}
                className="block px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {po.poNumber}
                      </p>
                      <StatusBadge status={po.status as any} size="sm" />
                      {po.status === 'INVOICED' && (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                          → Create Bill
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{po.title}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">
                      Supplier: {po.supplierName}
                    </p>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      £{po.totalAmount.toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(po.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          ) : (
            <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
              No purchase orders yet. <Link href="/purchase-orders/new" className="text-blue-600 hover:text-blue-700">Create your first PO</Link>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
