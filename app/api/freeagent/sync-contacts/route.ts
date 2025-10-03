import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { FreeAgentClient } from '@/lib/freeagent/client'
import { NextResponse } from 'next/server'

// POST /api/freeagent/sync-contacts - Sync contacts from FreeAgent
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Fetch contacts from FreeAgent
    const client = new FreeAgentClient(accessToken)
    const freeAgentContacts = await client.getContacts()

    let created = 0
    let updated = 0

    // Sync each contact
    for (const faContact of freeAgentContacts) {
      // Extract FreeAgent ID from URL
      const freeAgentId = faContact.url.split('/').pop()!

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

      // Upsert contact
      const existing = await prisma.contact.findUnique({
        where: { freeAgentId }
      })

      if (existing) {
        await prisma.contact.update({
          where: { freeAgentId },
          data: {
            name,
            email: faContact.email || null,
            phone: faContact.phone_number || null,
            address,
            isActive: faContact.is_active ?? true,
            syncedAt: new Date()
          }
        })
        updated++
      } else {
        await prisma.contact.create({
          data: {
            freeAgentId,
            name,
            email: faContact.email || null,
            phone: faContact.phone_number || null,
            address,
            isActive: faContact.is_active ?? true,
            organizationId: org.id
          }
        })
        created++
      }
    }

    return NextResponse.json({
      success: true,
      total: freeAgentContacts.length,
      created,
      updated
    })
  } catch (error) {
    console.error('Error syncing contacts:', error)
    return NextResponse.json(
      { error: 'Failed to sync contacts' },
      { status: 500 }
    )
  }
}
