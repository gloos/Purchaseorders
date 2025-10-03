import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
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

    const { organization } = dbUser

    return NextResponse.json({
      id: organization.id,
      name: organization.name,
      companyRegistrationNumber: organization.companyRegistrationNumber,
      vatNumber: organization.vatNumber,
      addressLine1: organization.addressLine1,
      addressLine2: organization.addressLine2,
      city: organization.city,
      region: organization.region,
      postcode: organization.postcode,
      country: organization.country,
      phone: organization.phone,
      email: organization.email,
      website: organization.website,
      logoUrl: organization.logoUrl,
      companySyncedAt: organization.companySyncedAt
    })
  } catch (error) {
    console.error('Error fetching organization profile:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization profile' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json()

    // Update organization profile
    const updatedOrganization = await prisma.organization.update({
      where: { id: dbUser.organizationId! },
      data: {
        name: body.name,
        companyRegistrationNumber: body.companyRegistrationNumber,
        vatNumber: body.vatNumber,
        addressLine1: body.addressLine1,
        addressLine2: body.addressLine2,
        city: body.city,
        region: body.region,
        postcode: body.postcode,
        country: body.country,
        phone: body.phone,
        email: body.email,
        website: body.website,
        logoUrl: body.logoUrl
      }
    })

    return NextResponse.json({
      id: updatedOrganization.id,
      name: updatedOrganization.name,
      companyRegistrationNumber: updatedOrganization.companyRegistrationNumber,
      vatNumber: updatedOrganization.vatNumber,
      addressLine1: updatedOrganization.addressLine1,
      addressLine2: updatedOrganization.addressLine2,
      city: updatedOrganization.city,
      region: updatedOrganization.region,
      postcode: updatedOrganization.postcode,
      country: updatedOrganization.country,
      phone: updatedOrganization.phone,
      email: updatedOrganization.email,
      website: updatedOrganization.website,
      logoUrl: updatedOrganization.logoUrl,
      companySyncedAt: updatedOrganization.companySyncedAt
    })
  } catch (error) {
    console.error('Error updating organization profile:', error)
    return NextResponse.json(
      { error: 'Failed to update organization profile' },
      { status: 500 }
    )
  }
}
