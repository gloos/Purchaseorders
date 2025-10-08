import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { FreeAgentClient } from '@/lib/freeagent/client'
import { checkRateLimit, getIdentifier, addRateLimitHeaders } from '@/lib/rate-limit'
import * as Sentry from '@sentry/nextjs'
import { Decimal } from '@prisma/client/runtime/library'
import { ProjectStatus, ProjectHealthStatus } from '@prisma/client'

// Helper function to perform the actual sync
async function performSync(syncLogId: string, organizationId: string, accessToken: string) {
  try {
    const freeAgent = new FreeAgentClient(accessToken)

    // Fetch all projects from FreeAgent
    const freeAgentProjects = await freeAgent.getProjects()

    // Update sync log with total count
    await prisma.projectSyncLog.update({
      where: { id: syncLogId },
      data: { projectsTotal: freeAgentProjects.length }
    })

    let synced = 0
    let failed = 0
    const errors: any[] = []

    for (const faProject of freeAgentProjects) {
      try {
        // Map FreeAgent status to our status
        const status = mapFreeAgentStatus(faProject.status)

        // Get client details if available
        let clientName = null
        let clientEmail = null
        let clientFreeAgentId = null

        if (faProject.contact) {
          try {
            const contactUrl = faProject.contact
            const contactId = contactUrl.split('/').pop()
            const contact = await prisma.contact.findUnique({
              where: { freeAgentId: contactId }
            })

            if (contact) {
              clientName = contact.name
              clientEmail = contact.email
              clientFreeAgentId = contactId
            }
          } catch (error) {
            console.warn('Failed to fetch client details:', error)
          }
        }

        // Calculate financial metrics
        const totalRevenue = faProject.total_invoiced_amount || 0
        const totalCosts = 0
        const profitAmount = totalRevenue - totalCosts
        const profitMargin = totalRevenue > 0 ? (profitAmount / totalRevenue) * 100 : 0

        // Upsert project
        await prisma.project.upsert({
          where: { freeAgentId: faProject.url },
          create: {
            freeAgentId: faProject.url,
            name: faProject.name,
            code: faProject.name,
            status,
            currency: faProject.currency || 'GBP',
            budget: faProject.budget_units ? parseFloat(faProject.budget_units) : null,
            totalRevenue,
            totalCosts,
            profitAmount,
            profitMargin,
            clientName,
            clientEmail,
            clientFreeAgentId,
            startDate: faProject.starts_on ? new Date(faProject.starts_on) : null,
            endDate: faProject.ends_on ? new Date(faProject.ends_on) : null,
            organizationId,
            completedAt: status === 'COMPLETED' ? new Date() : null,
            cancelledAt: status === 'CANCELLED' ? new Date() : null
          },
          update: {
            name: faProject.name,
            code: faProject.name,
            status,
            currency: faProject.currency || 'GBP',
            budget: faProject.budget_units ? parseFloat(faProject.budget_units) : null,
            totalRevenue,
            totalCosts,
            profitAmount,
            profitMargin,
            clientName,
            clientEmail,
            clientFreeAgentId,
            startDate: faProject.starts_on ? new Date(faProject.starts_on) : null,
            endDate: faProject.ends_on ? new Date(faProject.ends_on) : null,
            completedAt: status === 'COMPLETED' ? new Date() : null,
            cancelledAt: status === 'CANCELLED' ? new Date() : null
          }
        })

        synced++

        // Update progress periodically
        if (synced % 10 === 0) {
          await prisma.projectSyncLog.update({
            where: { id: syncLogId },
            data: { projectsSynced: synced }
          })
        }
      } catch (error) {
        failed++
        errors.push({
          project: faProject.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error(`Failed to sync project ${faProject.name}:`, error)
        Sentry.captureException(error)
      }
    }

    // Update sync log with completion
    await prisma.projectSyncLog.update({
      where: { id: syncLogId },
      data: {
        status: 'COMPLETED',
        projectsSynced: synced,
        projectsFailed: failed,
        errorDetails: errors.length > 0 ? errors : undefined,
        completedAt: new Date()
      }
    })

    // Update project health statuses and PO values
    await updateProjectMetrics(organizationId)

  } catch (error) {
    console.error('Sync failed:', error)
    Sentry.captureException(error)

    // Mark sync as failed
    await prisma.projectSyncLog.update({
      where: { id: syncLogId },
      data: {
        status: 'FAILED',
        errorDetails: [{
          error: error instanceof Error ? error.message : 'Sync operation failed'
        }],
        completedAt: new Date()
      }
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { organizationId, user } = await getUserAndOrgOrThrow()

    // Apply rate limiting
    const identifier = getIdentifier(request, user.id)
    const rateLimitResult = await checkRateLimit('freeagent', identifier)

    if (!rateLimitResult.success) {
      const headers = new Headers()
      addRateLimitHeaders(headers, rateLimitResult)
      return NextResponse.json(
        {
          error: 'Too many sync requests. Please try again later.',
          retryAfter: Math.ceil((rateLimitResult.reset - Date.now()) / 1000)
        },
        { status: 429, headers }
      )
    }

    // Check for FreeAgent connection
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        freeAgentAccessToken: true,
        freeAgentRefreshToken: true,
        freeAgentTokenExpiry: true
      }
    })

    if (!org?.freeAgentAccessToken) {
      return NextResponse.json(
        { error: 'FreeAgent not connected' },
        { status: 400 }
      )
    }

    // Check if token needs refresh
    let accessToken = org.freeAgentAccessToken
    if (org.freeAgentTokenExpiry && new Date() >= new Date(org.freeAgentTokenExpiry)) {
      if (!org.freeAgentRefreshToken) {
        return NextResponse.json(
          { error: 'FreeAgent token expired and no refresh token available' },
          { status: 400 }
        )
      }

      const tokens = await FreeAgentClient.refreshAccessToken(
        org.freeAgentRefreshToken,
        process.env.FREEAGENT_CLIENT_ID!,
        process.env.FREEAGENT_CLIENT_SECRET!
      )

      accessToken = tokens.access_token
      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          freeAgentAccessToken: tokens.access_token,
          freeAgentRefreshToken: tokens.refresh_token,
          freeAgentTokenExpiry: expiresAt
        }
      })
    }

    // Create sync log
    const syncLog = await prisma.projectSyncLog.create({
      data: {
        organizationId,
        syncType: 'FULL_SYNC',
        status: 'IN_PROGRESS'
      }
    })

    // Start sync in background (don't await)
    performSync(syncLog.id, organizationId, accessToken).catch(error => {
      console.error('Background sync error:', error)
      Sentry.captureException(error)
    })

    // Return immediately with sync log ID
    return NextResponse.json({
      syncLogId: syncLog.id,
      status: 'IN_PROGRESS',
      message: 'Sync started. Poll /api/projects/sync/' + syncLog.id + ' for status.'
    })

  } catch (error) {
    console.error('Error starting sync:', error)
    Sentry.captureException(error)
    return NextResponse.json(
      { error: 'Failed to start sync' },
      { status: 500 }
    )
  }
}

function mapFreeAgentStatus(freeAgentStatus: string): ProjectStatus {
  switch (freeAgentStatus?.toLowerCase()) {
    case 'active':
      return ProjectStatus.ACTIVE
    case 'completed':
      return ProjectStatus.COMPLETED
    case 'cancelled':
      return ProjectStatus.CANCELLED
    case 'hidden':
      return ProjectStatus.HIDDEN
    case 'pending':
      return ProjectStatus.ACTIVE // Map pending to active
    default:
      return ProjectStatus.ACTIVE
  }
}

async function updateProjectMetrics(organizationId: string) {
  const projects = await prisma.project.findMany({
    where: { organizationId },
    include: {
      purchaseOrders: {
        select: {
          totalAmount: true,
          status: true
        }
      }
    }
  })

  for (const project of projects) {
    const totalPoValue = project.purchaseOrders.reduce(
      (sum, po) => sum.add(new Decimal(po.totalAmount.toString())),
      new Decimal(0)
    )

    const totalRevenue = new Decimal(project.totalRevenue.toString())
    const profitAmount = totalRevenue.minus(totalPoValue)
    const profitMargin = totalRevenue.gt(0)
      ? profitAmount.div(totalRevenue).mul(100)
      : new Decimal(0)

    let healthStatus: ProjectHealthStatus = ProjectHealthStatus.UNKNOWN
    if (project.budget) {
      const budgetUsage = totalPoValue.div(project.budget).mul(100).toNumber()
      const threshold = project.budgetAlertThreshold || 75

      if (budgetUsage > 100 || profitMargin.toNumber() < 0) {
        healthStatus = ProjectHealthStatus.CRITICAL
      } else if (budgetUsage > threshold || profitMargin.toNumber() < 10) {
        healthStatus = ProjectHealthStatus.WARNING
      } else {
        healthStatus = ProjectHealthStatus.HEALTHY
      }
    }

    await prisma.project.update({
      where: { id: project.id },
      data: {
        totalPoValue,
        totalCosts: totalPoValue,
        profitAmount,
        profitMargin,
        healthStatus
      }
    })
  }
}
