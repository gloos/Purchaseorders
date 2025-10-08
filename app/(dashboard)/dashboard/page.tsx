'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Navbar } from '@/components/navbar'

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
  const router = useRouter()
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dashboard/analytics')
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      } else if (response.status === 401) {
        router.push('/login')
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-8">Dashboard</h1>

          {/* Analytics Cards */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                      Total Purchase Orders
                    </dt>
                    <dd className="text-2xl font-semibold text-slate-900 dark:text-white">
                      {analytics?.summary.totalPOs || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                      Total Value
                    </dt>
                    <dd className="text-2xl font-semibold text-slate-900 dark:text-white">
                      £{(analytics?.summary.totalValue || 0).toFixed(2)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                      Pending
                    </dt>
                    <dd className="text-2xl font-semibold text-slate-900 dark:text-white">
                      {(analytics?.summary.statusCounts.PENDING_APPROVAL || 0) + (analytics?.summary.statusCounts.DRAFT || 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
                      Completed
                    </dt>
                    <dd className="text-2xl font-semibold text-slate-900 dark:text-white">
                      {analytics?.summary.statusCounts.RECEIVED || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
            {/* Status Distribution Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
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
            </div>

            {/* Monthly Trends Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
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
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
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
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-slate-900 dark:text-white">
                            {po.poNumber}
                          </p>
                          <span className={`ml-3 px-2 py-1 text-xs font-semibold rounded-full ${
                            po.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                            po.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-800' :
                            po.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            po.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                            po.status === 'RECEIVED' ? 'bg-purple-100 text-purple-800' :
                            po.status === 'INVOICED' ? 'bg-teal-100 text-teal-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {STATUS_LABELS[po.status] || po.status}
                          </span>
                          {po.status === 'INVOICED' && (
                            <span className="ml-2 px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-800">
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
          </div>
        </div>
      </main>
    </div>
  )
}
