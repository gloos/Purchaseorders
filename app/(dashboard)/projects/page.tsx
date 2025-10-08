'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { useUser } from '@/lib/hooks/use-user'
import { ProjectWithStats, ProjectStatus } from '@/types/project'

const statusColors: Record<ProjectStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-800',
  HIDDEN: 'bg-gray-100 text-gray-800',
  ON_HOLD: 'bg-yellow-100 text-yellow-800'
}

const healthColors = {
  HEALTHY: 'text-green-600',
  WARNING: 'text-yellow-600',
  CRITICAL: 'text-red-600',
  UNKNOWN: 'text-gray-400'
}

const healthIcons = {
  HEALTHY: '●',
  WARNING: '▲',
  CRITICAL: '■',
  UNKNOWN: '○'
}

export default function ProjectsPage() {
  const { hasPermission, loading: userLoading } = useUser()
  const [projects, setProjects] = useState<ProjectWithStats[]>([])
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  })

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.status) params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)

      const response = await fetch(`/api/projects?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    if (!userLoading) {
      fetchProjects()
    }
  }, [fetchProjects, userLoading])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/projects/sync', {
        method: 'POST'
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Synced ${result.synced} projects successfully!`)
        await fetchProjects()
      } else {
        const error = await response.json()
        alert(`Sync failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Error syncing projects:', error)
      alert('Failed to sync projects')
    } finally {
      setSyncing(false)
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(new Set(projects.map(p => p.id)))
    } else {
      setSelectedProjects(new Set())
    }
  }

  const handleSelectProject = (projectId: string, checked: boolean) => {
    const newSelection = new Set(selectedProjects)
    if (checked) {
      newSelection.add(projectId)
    } else {
      newSelection.delete(projectId)
    }
    setSelectedProjects(newSelection)
  }

  const handleBatchUpdateStatus = async (status: ProjectStatus) => {
    if (selectedProjects.size === 0) return

    try {
      const response = await fetch('/api/projects/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectIds: Array.from(selectedProjects),
          operation: 'updateStatus',
          data: { status }
        })
      })

      if (response.ok) {
        setSelectedProjects(new Set())
        await fetchProjects()
      }
    } catch (error) {
      console.error('Error updating projects:', error)
    }
  }

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value
    return `£${num.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  if (userLoading) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Navbar />

      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Projects
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Manage and track project profitability
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium py-2 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {syncing ? '🔄 Syncing...' : '🔄 Sync with FreeAgent'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <input
            type="text"
            placeholder="Search projects..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white flex-1"
          />
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="border border-slate-300 dark:border-slate-600 rounded-lg px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        {/* Batch Actions Bar */}
        {selectedProjects.size > 0 && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
            <span className="text-blue-900 dark:text-blue-300">
              {selectedProjects.size} project{selectedProjects.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => handleBatchUpdateStatus('ACTIVE')}
                className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Mark Active
              </button>
              <button
                onClick={() => handleBatchUpdateStatus('COMPLETED')}
                className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Mark Completed
              </button>
              <button
                onClick={() => handleBatchUpdateStatus('ON_HOLD')}
                className="text-sm px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
              >
                Put On Hold
              </button>
              <button
                onClick={() => setSelectedProjects(new Set())}
                className="text-sm px-3 py-1 bg-slate-600 text-white rounded hover:bg-slate-700"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Projects Table */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400">Loading projects...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <p className="text-slate-600 dark:text-slate-400">
              No projects found. {' '}
              <button onClick={handleSync} className="text-blue-600 hover:text-blue-700 underline">
                Sync from FreeAgent
              </button>
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={projects.length > 0 && projects.every(p => selectedProjects.has(p.id))}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Budget
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    P&L
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Health
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProjects.has(project.id)}
                        onChange={(e) => handleSelectProject(project.id, e.target.checked)}
                        className="rounded"
                      />
                    </td>

                    <td className="px-6 py-4">
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {project.name}
                      </Link>
                      {project.code && (
                        <div className="text-sm text-slate-500">{project.code}</div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[project.status]}`}>
                        {project.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-sm text-slate-900 dark:text-slate-300">
                      {project.clientName || '-'}
                    </td>

                    <td className="px-6 py-4">
                      {project.budget ? (
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-300">
                            {formatCurrency(project.totalPoValue)} / {formatCurrency(project.budget)}
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className={`h-2 rounded-full ${
                                (project.budgetUsage || 0) > 90 ? 'bg-red-500' :
                                (project.budgetUsage || 0) > 75 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(project.budgetUsage || 0, 100)}%` }}
                            />
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {project.budgetUsage?.toFixed(0)}% used
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-900 dark:text-slate-300">
                          {formatCurrency(project.totalPoValue)}
                          <div className="text-xs text-slate-500">No budget set</div>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <span className={`text-sm font-medium ${
                          parseFloat(project.profitMargin) > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {parseFloat(project.profitMargin).toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatCurrency(project.profitAmount)}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-lg ${healthColors[project.healthStatus]}`}>
                          {healthIcons[project.healthStatus]}
                        </span>
                        <span className="text-xs text-slate-500">
                          {project.healthStatus}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
