import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { FreeAgentClient } from '@/lib/freeagent/client'
import { checkRateLimit, getIdentifier, addRateLimitHeaders } from '@/lib/rate-limit'
import * as Sentry from '@sentry/nextjs'
import { Decimal } from '@prisma/client/runtime/library'

export async function POST(request: NextRequest) {
  try {
    const { organizationId, user } = await getUserAndOrgOrThrow()

    // Apply rate limiting (FreeAgent API rate limit)
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

    try {
      const freeAgent = new FreeAgentClient(accessToken)

      // Fetch all projects from FreeAgent
      const freeAgentProjects = await freeAgent.getProjects()

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
              // Continue without client details if fetch fails
              console.warn('Failed to fetch client details:', error)
            }
          }

          // Calculate financial metrics
          // Note: For now, we're setting these to defaults
          // In the future, we can fetch invoices and bills from FreeAgent
          const totalRevenue = faProject.total_invoiced_amount || 0
          const totalCosts = 0 // Would need to fetch bills
          const profitAmount = totalRevenue - totalCosts
          const profitMargin = totalRevenue > 0 ? (profitAmount / totalRevenue) * 100 : 0

          // Upsert project
          await prisma.project.upsert({
            where: { freeAgentId: faProject.url },
            create: {
              freeAgentId: faProject.url,
              name: faProject.name,
              code: faProject.name, // FreeAgent doesn't have separate code field
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
              freeAgentUrl: faProject.url,
              freeAgentCreatedAt: new Date(faProject.created_at),
              freeAgentUpdatedAt: new Date(faProject.updated_at),
              lastSyncedAt: new Date(),
              organizationId
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
              freeAgentUpdatedAt: new Date(faProject.updated_at),
              lastSyncedAt: new Date(),
              syncError: null
            }
          })

          synced++
        } catch (error: any) {
          failed++
          errors.push({
            project: faProject.name,
            error: error.message
          })

          // Mark project with sync error
          if (faProject.url) {
            await prisma.project.updateMany({
              where: { freeAgentId: faProject.url },
              data: { syncError: error.message }
            }).catch(() => {}) // Ignore if project doesn't exist
          }
        }
      }

      // Update sync log
      await prisma.projectSyncLog.update({
        where: { id: syncLog.id },
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

      // Add rate limit headers
      const headers = new Headers()
      addRateLimitHeaders(headers, rateLimitResult)

      return NextResponse.json({
        success: true,
        synced,
        failed,
        errors: errors.length > 0 ? errors : undefined
      }, { headers })

    } catch (error: any) {
      // Update sync log with failure
      await prisma.projectSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'FAILED',
          errorDetails: { error: error.message },
          completedAt: new Date()
        }
      })

      throw error
    }

  } catch (error) {
    console.error('Error syncing projects:', error)
    Sentry.captureException(error)
    return NextResponse.json(
      { error: 'Failed to sync projects' },
      { status: 500 }
    )
  }
}

function mapFreeAgentStatus(faStatus: string): 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'HIDDEN' | 'ON_HOLD' {
  const statusMap: Record<string, 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'HIDDEN' | 'ON_HOLD'> = {
    'Active': 'ACTIVE',
    'Completed': 'COMPLETED',
    'Cancelled': 'CANCELLED',
    'Hidden': 'HIDDEN',
    'Pending': 'ON_HOLD'
  }
  return statusMap[faStatus] || 'ACTIVE'
}

async function updateProjectMetrics(organizationId: string) {
  const projects = await prisma.project.findMany({
    where: { organizationId },
    include: {
      purchaseOrders: {
        select: { totalAmount: true, status: true }
      }
    }
  })

  for (const project of projects) {
    const totalPoValue = project.purchaseOrders.reduce(
      (sum, po) => sum.add(new Decimal(po.totalAmount.toString())),
      new Decimal(0)
    )

    let healthStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'UNKNOWN' = 'UNKNOWN'

    if (project.budget) {
      const budgetUsage = totalPoValue.div(project.budget.toString()).mul(100).toNumber()

      if (budgetUsage > 100 || project.profitMargin.toNumber() < 0) {
        healthStatus = 'CRITICAL'
      } else if (budgetUsage > (project.budgetAlertThreshold || 75) || project.profitMargin.toNumber() < 10) {
        healthStatus = 'WARNING'
      } else {
        healthStatus = 'HEALTHY'
      }
    }

    await prisma.project.update({
      where: { id: project.id },
      data: {
        totalPoValue: totalPoValue,
        healthStatus
      }
    })
  }
}
