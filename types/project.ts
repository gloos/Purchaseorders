import { ProjectStatus, ProjectHealthStatus, Project as PrismaProject } from '@prisma/client'

export interface Project extends Omit<PrismaProject, 'budget' | 'totalRevenue' | 'totalCosts' | 'totalPoValue' | 'profitAmount' | 'profitMargin'> {
  budget: string | null
  totalRevenue: string
  totalCosts: string
  totalPoValue: string
  profitAmount: string
  profitMargin: string
}

export interface ProjectWithStats extends Project {
  poCount: number
  committedValue: string
  budgetUsage: number | null
  teamMembers?: {
    id: string
    role: string | null
    user: {
      id: string
      name: string | null
      email: string
    }
  }[]
}

export interface ProjectAnalytics {
  summary: {
    totalPoValue: string
    poCount: number
    committedValue: string
    pendingValue: string
    avgPoValue: string
  }
  budget: {
    budget: string | null
    spent: string
    committed: string
    available: string | null
    percentUsed: number | null
    percentCommitted: number | null
    isOverBudget: boolean
    projectedOverrun: string | null
  }
  profitability: {
    revenue: string
    costs: string
    profit: string
    margin: number | null
    projectedProfit: string | null
    projectedMargin: number | null
  }
  timeline: {
    startDate: Date | null
    endDate: Date | null
    duration: number | null
    elapsed: number | null
    remaining: number | null
    percentComplete: number | null
    isOverdue: boolean
    daysOverdue: number | null
  }
  topSuppliers: {
    name: string
    count: number
    value: string
  }[]
  monthlyTrend: {
    month: string
    count: number
    value: string
  }[]
  statusBreakdown: {
    status: string
    count: number
    value: string
  }[]
}

export interface ProjectFilters {
  status?: ProjectStatus
  search?: string
  clientId?: string
}

export interface ProjectSortConfig {
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export { ProjectStatus, ProjectHealthStatus }
