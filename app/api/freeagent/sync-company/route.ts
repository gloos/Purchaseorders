import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { refreshFreeAgentToken } from '@/lib/freeagent/client'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the user's organization
    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      include: { organization: true }
    })

    if (!dbUser?.organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const organization = dbUser.organization

    // Check if FreeAgent is connected
    if (!organization.freeAgentAccessToken) {
      return NextResponse.json({ error: 'FreeAgent not connected' }, { status: 400 })
    }

    // Refresh token if needed
    let accessToken = organization.freeAgentAccessToken
    if (organization.freeAgentTokenExpiry && new Date(organization.freeAgentTokenExpiry) < new Date()) {
      const refreshed = await refreshFreeAgentToken(organization.freeAgentRefreshToken!)
      accessToken = refreshed.access_token

      await prisma.organization.update({
        where: { id: organization.id },
        data: {
          freeAgentAccessToken: refreshed.access_token,
          freeAgentRefreshToken: refreshed.refresh_token,
          freeAgentTokenExpiry: new Date(Date.now() + refreshed.expires_in * 1000)
        }
      })
    }

    // Fetch company information from FreeAgent
    const response = await fetch('https://api.freeagent.com/v2/company', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch company from FreeAgent')
    }

    const data = await response.json()
    const company = data.company

    // Update organization with company information
    await prisma.organization.update({
      where: { id: organization.id },
      data: {
        name: company.name || organization.name,
        companyRegistrationNumber: company.company_registration_number,
        vatNumber: company.sales_tax_registration_number,
        addressLine1: company.address1,
        addressLine2: company.address2,
        city: company.town,
        region: company.region,
        postcode: company.postcode,
        country: company.country,
        phone: company.contact_phone,
        email: company.contact_email,
        website: company.website,
        freeAgentCompanyUrl: company.url,
        companySyncedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Company information synced successfully'
    })
  } catch (error) {
    console.error('Error syncing company:', error)
    return NextResponse.json(
      { error: 'Failed to sync company information' },
      { status: 500 }
    )
  }
}
