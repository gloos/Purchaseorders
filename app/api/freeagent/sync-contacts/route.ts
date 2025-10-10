import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { FreeAgentClient } from '@/lib/freeagent/client'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getIdentifier, addRateLimitHeaders } from '@/lib/rate-limit'

// Keep timeout reasonable to avoid connection pool issues
export const maxDuration = 30 // 30 seconds

// POST /api/freeagent/sync-contacts - Sync contacts from FreeAgent
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Apply rate limiting (10 sync requests per minute per user)
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

    // Get user's organization with FreeAgent tokens
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { organization: true }
    })

    if (!dbUser?.organization) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const org = dbUser.organization

    if (!org.freeAgentAccessToken) {
      return NextResponse.json(
        { error: 'FreeAgent not connected' },
        { status: 400 }
      )
    }

    // Check if token needs refresh
    let accessToken = org.freeAgentAccessToken
    if (org.freeAgentTokenExpiry && new Date() >= new Date(org.freeAgentTokenExpiry)) {
      // Token expired, refresh it
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

      // Update tokens
      await prisma.organization.update({
        where: { id: org.id },
        data: {
          freeAgentAccessToken: tokens.access_token,
          freeAgentRefreshToken: tokens.refresh_token,
          freeAgentTokenExpiry: expiresAt
        }
      })
    }

    // Fetch ALL contacts from FreeAgent (no limit)
    const client = new FreeAgentClient(accessToken)
    const freeAgentContacts = await client.getContacts()

    // Get all existing contacts with their sync timestamps
    const existingContacts = await prisma.contact.findMany({
      where: { organizationId: org.id },
      select: { freeAgentId: true, syncedAt: true }
    })

    // Create a map for quick lookups: freeAgentId -> syncedAt
    const existingContactsMap = new Map(
      existingContacts.map(c => [c.freeAgentId, c.syncedAt])
    )

    // Only sync contacts that are new OR haven't been synced in the last hour
    const ONE_HOUR_AGO = new Date(Date.now() - 60 * 60 * 1000)

    // Prepare bulk data
    const contactsToCreate: any[] = []
    const contactsToUpdate: any[] = []
    let skipped = 0

    for (const faContact of freeAgentContacts) {
      // Extract FreeAgent ID from URL
      const freeAgentId = faContact.url.split('/').pop()!

      const lastSyncedAt = existingContactsMap.get(freeAgentId)

      // Skip if contact was synced recently (within last hour)
      if (lastSyncedAt && lastSyncedAt > ONE_HOUR_AGO) {
        skipped++
        continue
      }

      // Build contact name
      let name = faContact.organisation_name || ''
      if (!name && faContact.first_name) {
        name = `${faContact.first_name} ${faContact.last_name || ''}`.trim()
      }
      if (!name) {
        name = 'Unnamed Contact'
      }

      // Build address
      const addressParts = [
        faContact.address1,
        faContact.address2,
        faContact.address3,
        faContact.town,
        faContact.region,
        faContact.postcode,
        faContact.country
      ].filter(Boolean)
      const address = addressParts.length > 0 ? addressParts.join(', ') : null

      const contactData = {
        freeAgentId,
        name,
        email: faContact.email || null,
        phone: faContact.phone_number || null,
        address,
        isActive: faContact.is_active ?? true,
        syncedAt: new Date(),
        organizationId: org.id
      }

      if (existingContactsMap.has(freeAgentId)) {
        contactsToUpdate.push(contactData)
      } else {
        contactsToCreate.push(contactData)
      }
    }

    // Bulk create new contacts
    let created = 0
    if (contactsToCreate.length > 0) {
      const result = await prisma.contact.createMany({
        data: contactsToCreate,
        skipDuplicates: true
      })
      created = result.count
    }

    // Update existing contacts in parallel batches (no transactions to avoid pooler issues)
    let updated = 0
    if (contactsToUpdate.length > 0) {
      const batchSize = 50 // Process 50 updates at a time

      for (let i = 0; i < contactsToUpdate.length; i += batchSize) {
        const batch = contactsToUpdate.slice(i, i + batchSize)

        // Use Promise.all instead of transaction to avoid connection pooler issues
        await Promise.all(
          batch.map(contact =>
            prisma.contact.update({
              where: { freeAgentId: contact.freeAgentId },
              data: {
                name: contact.name,
                email: contact.email,
                phone: contact.phone,
                address: contact.address,
                isActive: contact.isActive,
                syncedAt: contact.syncedAt
              }
            })
          )
        )

        updated += batch.length
      }
    }

    // Add rate limit headers to success response
    const headers = new Headers()
    addRateLimitHeaders(headers, rateLimitResult)

    return NextResponse.json({
      success: true,
      total: freeAgentContacts.length,
      created,
      updated,
      skipped,
      message: skipped > 0
        ? `Synced successfully! Created: ${created}, Updated: ${updated}, Skipped: ${skipped} (recently synced).`
        : `Synced successfully! Created: ${created}, Updated: ${updated}.`
    }, { headers })
  } catch (error) {
    console.error('Error syncing contacts:', error)

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('429')) {
        return NextResponse.json(
          { error: 'FreeAgent rate limit exceeded. Please wait a few minutes and try again.' },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { error: `Failed to sync contacts: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to sync contacts' },
      { status: 500 }
    )
  }
}
