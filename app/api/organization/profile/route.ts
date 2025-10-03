import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { updateOrganizationSchema, validateRequestBody } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const { organizationId } = await getUserAndOrgOrThrow()

    const organization = await prisma.organization.findUnique({
      where: { id: organizationId }
    })

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

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
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'No organization found') {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }
    }
    return NextResponse.json(
      { error: 'Failed to fetch organization profile' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { organizationId } = await getUserAndOrgOrThrow()

    const body = await request.json()

    // Validate request body
    const validation = validateRequestBody(updateOrganizationSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    // Update organization profile
    const updatedOrganization = await prisma.organization.update({
      where: { id: organizationId },
      data: validation.data
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
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'No organization found') {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }
    }
    return NextResponse.json(
      { error: 'Failed to update organization profile' },
      { status: 500 }
    )
  }
}
