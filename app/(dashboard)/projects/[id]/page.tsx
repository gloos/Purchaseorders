'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { Navbar } from '@/components/navbar'
import { ProjectStatus, ProjectAnalytics } from '@/types/project'

const statusColors: Record<ProjectStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
  HIDDEN: 'bg-gray-100 text-gray-800',
  ON_HOLD: 'bg-yellow-100 text-yellow-800'
}

interface Project {
  id: string
  name: string
  code: string | null
  status: ProjectStatus
  description: string | null
  budget: string | null
  budgetAlertThreshold: number | null
  totalRevenue: string
  totalCosts: string
  totalPoValue: string
  profitAmount: string
  profitMargin: string
  clientName: string | null
  clientEmail: string | null
  startDate: string | null
  endDate: string | null
  purchaseOrders: any[]
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'pos' | 'analytics'>('overview')

  useEffect(() => {
    if (params.id) {
      fetchProject()
      fetchAnalytics()
    }
  }, [params.id])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data)
      }
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/projects/${params.id}/analytics`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    try {
      const response = await fetch(`/api/projects/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        await fetchProject()
      }
    } catch (error) {
      console.error('Error updating project status:', error)
    }
  }

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return `£${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!project) {
    return <div>Project not found</div>
  }

  const budgetUsage = project.budget
    ? (parseFloat(project.totalPoValue) / parseFloat(project.budget)) * 100
    : 0

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="p-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 mb-2">
            <Link href="/projects" className="hover:text-blue-600">Projects</Link>
            <span>/</span>
            <span>{project.name}</span>
          </div>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                {project.name}
              </h1>
              {project.code && (
                <p className="text-slate-600 dark:text-slate-400 mt-1">Code: {project.code}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusColors[project.status]}`}>
                {project.status}
              </span>

              <select
                value={project.status}
                onChange={(e) => handleStatusChange(e.target.value as ProjectStatus)}
                className="border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-600 dark:text-slate-400">Total PO Value</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {formatCurrency(project.totalPoValue)}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {project.purchaseOrders.length} PO{project.purchaseOrders.length !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-600 dark:text-slate-400">Budget</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {project.budget ? formatCurrency(project.budget) : 'Not set'}
            </div>
            {project.budget && (
              <div className="text-sm text-slate-500 mt-1">
                {budgetUsage.toFixed(1)}% used
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-600 dark:text-slate-400">Profit</div>
            <div className={`text-2xl font-bold mt-1 ${
              parseFloat(project.profitAmount) >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(project.profitAmount)}
            </div>
            <div className="text-sm text-slate-500 mt-1">
              {parseFloat(project.profitMargin).toFixed(1)}% margin
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-600 dark:text-slate-400">Client</div>
            <div className="text-xl font-semibold text-slate-900 dark:text-white mt-1">
              {project.clientName || 'No client'}
            </div>
            {project.clientEmail && (
              <div className="text-sm text-slate-500 mt-1">{project.clientEmail}</div>
            )}
          </div>
        </div>

        {/* Budget Progress Bar */}
        {project.budget && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 mb-8">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Budget Tracking</h3>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {formatCurrency(project.totalPoValue)} / {formatCurrency(project.budget)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all ${
                  budgetUsage > 100 ? 'bg-red-500' :
                  budgetUsage > 75 ? 'bg-yellow-500' :
                  'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgetUsage, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span>0%</span>
              <span>{budgetUsage.toFixed(1)}%</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-slate-200 dark:border-slate-700">
            <nav className="flex gap-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('pos')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'pos'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Purchase Orders ({project.purchaseOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'analytics'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Analytics
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Project Details</h3>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400">Description</label>
                <p className="text-slate-900 dark:text-white mt-1">
                  {project.description || 'No description'}
                </p>
              </div>

              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400">Timeline</label>
                <p className="text-slate-900 dark:text-white mt-1">
                  {project.startDate && project.endDate
                    ? `${format(new Date(project.startDate), 'MMM d, yyyy')} - ${format(new Date(project.endDate), 'MMM d, yyyy')}`
                    : 'No timeline set'}
                </p>
              </div>

              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400">Total Revenue</label>
                <p className="text-slate-900 dark:text-white mt-1">
                  {formatCurrency(project.totalRevenue)}
                </p>
              </div>

              <div>
                <label className="text-sm text-slate-600 dark:text-slate-400">Total Costs</label>
                <p className="text-slate-900 dark:text-white mt-1">
                  {formatCurrency(project.totalPoValue)}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pos' && (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {project.purchaseOrders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 dark:text-slate-400">No purchase orders for this project yet.</p>
              </div>
            ) : (
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">PO Number</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Supplier</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {project.purchaseOrders.map((po) => (
                    <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                      <td className="px-6 py-4">
                        <Link href={`/purchase-orders/${po.id}`} className="text-blue-600 hover:text-blue-700 font-medium">
                          {po.poNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-300">{po.title}</td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-300">{po.supplierName}</td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-300">{formatCurrency(po.totalAmount)}</td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-300">
                        {format(new Date(po.orderDate), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'analytics' && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Top Suppliers</h3>
                {analytics.topSuppliers.length === 0 ? (
                  <p className="text-slate-600 dark:text-slate-400">No suppliers yet</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.topSuppliers.map((supplier, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm text-slate-900 dark:text-slate-300">{supplier.name}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {formatCurrency(supplier.value)}
                          </div>
                          <div className="text-xs text-slate-500">{supplier.count} PO{supplier.count !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Status Breakdown</h3>
                {analytics.statusBreakdown.length === 0 ? (
                  <p className="text-slate-600 dark:text-slate-400">No data yet</p>
                ) : (
                  <div className="space-y-3">
                    {analytics.statusBreakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="text-sm text-slate-900 dark:text-slate-300">{item.status}</span>
                        <div className="text-right">
                          <div className="text-sm font-medium text-slate-900 dark:text-white">
                            {formatCurrency(item.value)}
                          </div>
                          <div className="text-xs text-slate-500">{item.count} PO{item.count !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
