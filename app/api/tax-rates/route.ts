import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { requirePermission } from '@/lib/rbac'
import { TaxType } from '@prisma/client'

// GET /api/tax-rates - List all tax rates for user's organization
export async function GET() {
  try {
    const { organizationId } = await getUserAndOrgOrThrow()

    const taxRates = await prisma.taxRate.findMany({
      where: {
        organizationId
      },
      orderBy: [
        { isDefault: 'desc' },
        { isActive: 'desc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(taxRates)
  } catch (error) {
    console.error('Error fetching tax rates:', error)

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'No organization found') {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to fetch tax rates' },
      { status: 500 }
    )
  }
}

// POST /api/tax-rates - Create a new tax rate
export async function POST(request: Request) {
  try {
    const { user, organizationId } = await getUserAndOrgOrThrow()

    // Check permission to manage organization settings
    requirePermission(user.role, 'canManageOrganization')

    const body = await request.json()
    const { name, taxType, rate, description, region, isDefault, isActive } = body

    // Validation
    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Tax rate name is required' }, { status: 400 })
    }

    if (rate === undefined || rate === null) {
      return NextResponse.json({ error: 'Tax rate is required' }, { status: 400 })
    }

    const rateNum = parseFloat(rate)
    if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
      return NextResponse.json({ error: 'Tax rate must be between 0 and 100' }, { status: 400 })
    }

    if (taxType && !['VAT', 'GST', 'SALES_TAX', 'CONSUMPTION', 'CUSTOM'].includes(taxType)) {
      return NextResponse.json({ error: 'Invalid tax type' }, { status: 400 })
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.taxRate.updateMany({
        where: {
          organizationId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    const taxRate = await prisma.taxRate.create({
      data: {
        name,
        taxType: (taxType as TaxType) || 'VAT',
        rate: rateNum,
        description: description || null,
        region: region || null,
        isDefault: isDefault || false,
        isActive: isActive !== undefined ? isActive : true,
        organizationId
      }
    })

    return NextResponse.json(taxRate, { status: 201 })
  } catch (error) {
    console.error('Error creating tax rate:', error)

    const { AuthorizationError } = await import('@/lib/rbac')

    if (error instanceof AuthorizationError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'No organization found') {
        return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
      }
    }

    return NextResponse.json(
      { error: 'Failed to create tax rate' },
      { status: 500 }
    )
  }
}
