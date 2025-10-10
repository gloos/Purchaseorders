/**
 * Platform Settings - Reset Organization Count API
 *
 * Recalculates and resets the organization count to match the actual
 * number of organizations in the database.
 * Only accessible to SUPER_ADMIN users.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserWithRole } from '@/lib/auth-helpers'
import { resetOrgCount } from '@/lib/platform-settings'

/**
 * POST /api/platform-settings/reset-count
 * Reset the organization count to match actual database count
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getUserWithRole(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPER_ADMIN can reset the count
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 })
    }

    const settings = await resetOrgCount()

    return NextResponse.json({
      success: true,
      message: 'Organization count reset successfully',
      currentOrgCount: settings.currentOrgCount
    })
  } catch (error) {
    console.error('Error resetting organization count:', error)
    return NextResponse.json({ error: 'Failed to reset organization count' }, { status: 500 })
  }
}
