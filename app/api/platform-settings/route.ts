/**
 * Platform Settings API
 *
 * Manages global platform settings including signup control.
 * Only accessible to SUPER_ADMIN users.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getUserWithRole } from '@/lib/auth-helpers'
import { getSettings, updateSettings } from '@/lib/platform-settings'
import { z } from 'zod'

// Validation schema for update requests
const updateSchema = z.object({
  signupsEnabled: z.boolean().optional(),
  maxOrganizations: z.number().int().min(0).nullable().optional()
})

/**
 * GET /api/platform-settings
 * Retrieve current platform settings
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getUserWithRole(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPER_ADMIN can access platform settings
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 })
    }

    const settings = await getSettings()

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching platform settings:', error)
    return NextResponse.json({ error: 'Failed to fetch platform settings' }, { status: 500 })
  }
}

/**
 * PUT /api/platform-settings
 * Update platform settings
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const user = await getUserWithRole(supabase)

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only SUPER_ADMIN can modify platform settings
    if (user.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Super Admin access required' }, { status: 403 })
    }

    const body = await request.json()

    // Validate request body
    const result = updateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: result.error.issues },
        { status: 400 }
      )
    }

    const updatedSettings = await updateSettings(result.data)

    return NextResponse.json(updatedSettings)
  } catch (error) {
    console.error('Error updating platform settings:', error)
    return NextResponse.json({ error: 'Failed to update platform settings' }, { status: 500 })
  }
}
