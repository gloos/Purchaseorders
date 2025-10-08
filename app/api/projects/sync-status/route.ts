import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import * as Sentry from '@sentry/nextjs'

// GET /api/projects/sync-status - Get the most recent in-progress sync
export async function GET() {
  try {
    const { organizationId } = await getUserAndOrgOrThrow()

    // Find the most recent IN_PROGRESS sync
    const syncLog = await prisma.projectSyncLog.findFirst({
      where: {
        organizationId,
        status: 'IN_PROGRESS'
      },
      orderBy: {
        startedAt: 'desc'
      }
    })

    if (!syncLog) {
      return NextResponse.json({
        status: 'NONE',
        syncLogId: null
      })
    }

    return NextResponse.json({
      status: syncLog.status,
      syncLogId: syncLog.id,
      projectsTotal: syncLog.projectsTotal || 0,
      projectsSynced: syncLog.projectsSynced || 0,
      projectsFailed: syncLog.projectsFailed || 0,
      startedAt: syncLog.startedAt
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
