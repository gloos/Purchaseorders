/**
 * Platform Settings Helper Functions
 *
 * This module provides utilities for managing global platform settings,
 * particularly for controlling signups and organization limits.
 */

import { prisma } from '@/lib/prisma'

const SINGLETON_ID = 'singleton'

/**
 * Get the platform settings, creating them if they don't exist
 */
export async function getSettings() {
  let settings = await prisma.platformSettings.findUnique({
    where: { id: SINGLETON_ID }
  })

  // Create with defaults if doesn't exist
  if (!settings) {
    settings = await prisma.platformSettings.create({
      data: {
        id: SINGLETON_ID,
        signupsEnabled: true,
        maxOrganizations: null,
        currentOrgCount: 0
      }
    })
  }

  return settings
}

/**
 * Update platform settings
 */
export async function updateSettings(data: {
  signupsEnabled?: boolean
  maxOrganizations?: number | null
}) {
  return await prisma.platformSettings.update({
    where: { id: SINGLETON_ID },
    data: {
      ...data,
      updatedAt: new Date()
    }
  })
}

/**
 * Check if signups are currently available
 * Returns { available: boolean, reason?: string }
 */
export async function checkSignupAvailability(): Promise<{
  available: boolean
  reason?: string
}> {
  const settings = await getSettings()

  // Check if signups are disabled
  if (!settings.signupsEnabled) {
    return {
      available: false,
      reason: 'Signups are currently closed.'
    }
  }

  // Check if we've reached the max organizations limit
  if (settings.maxOrganizations !== null && settings.currentOrgCount >= settings.maxOrganizations) {
    return {
      available: false,
      reason: 'We have reached our maximum capacity. Signups are temporarily closed.'
    }
  }

  return { available: true }
}

/**
 * Increment the organization count
 * This should be called after a new organization is successfully created
 */
export async function incrementOrgCount() {
  return await prisma.platformSettings.update({
    where: { id: SINGLETON_ID },
    data: {
      currentOrgCount: {
        increment: 1
      },
      updatedAt: new Date()
    }
  })
}

/**
 * Reset the organization count to match the actual number of organizations in the database
 * This is useful for fixing drift or after manual database operations
 */
export async function resetOrgCount() {
  const actualCount = await prisma.organization.count()

  return await prisma.platformSettings.update({
    where: { id: SINGLETON_ID },
    data: {
      currentOrgCount: actualCount,
      updatedAt: new Date()
    }
  })
}
