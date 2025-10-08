import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import * as Sentry from '@sentry/nextjs'

// GET /api/projects/sync/[id] - Get sync status
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { organizationId } = await getUserAndOrgOrThrow()

    const syncLog = await prisma.projectSyncLog.findFirst({
      where: {
        id,
        organizationId
      }
    })

    if (!syncLog) {
      return NextResponse.json(
        { error: 'Sync log not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: syncLog.id,
      status: syncLog.status,
      syncType: syncLog.syncType,
      projectsTotal: syncLog.projectsTotal || 0,
      projectsSynced: syncLog.projectsSynced || 0,
      projectsFailed: syncLog.projectsFailed || 0,
      errorDetails: syncLog.errorDetails,
      startedAt: syncLog.startedAt,
      completedAt: syncLog.completedAt
    })
  } catch (error) {
    console.error('Error fetching sync status:', error)
    Sentry.captureException(error)
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    )
  }
}
