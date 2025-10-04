import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'
import { requirePermission } from '@/lib/rbac'
import { TaxType } from '@prisma/client'

// PATCH /api/tax-rates/[id] - Update a tax rate
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, organizationId } = await getUserAndOrgOrThrow()

    // Check permission to manage organization settings
    requirePermission(user.role, 'canManageOrganization')

    // Verify the tax rate belongs to user's organization
    const existingTaxRate = await prisma.taxRate.findFirst({
      where: {
        id: params.id,
        organizationId
      }
    })

    if (!existingTaxRate) {
      return NextResponse.json({ error: 'Tax rate not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, taxType, rate, description, region, isDefault, isActive } = body

    // Validation
    if (name !== undefined && name.trim() === '') {
      return NextResponse.json({ error: 'Tax rate name cannot be empty' }, { status: 400 })
    }

    if (rate !== undefined && rate !== null) {
      const rateNum = parseFloat(rate)
      if (isNaN(rateNum) || rateNum < 0 || rateNum > 100) {
        return NextResponse.json({ error: 'Tax rate must be between 0 and 100' }, { status: 400 })
      }
    }

    if (taxType && !['VAT', 'GST', 'SALES_TAX', 'CONSUMPTION', 'CUSTOM'].includes(taxType)) {
      return NextResponse.json({ error: 'Invalid tax type' }, { status: 400 })
    }

    // If setting as default, unset other defaults
    if (isDefault && !existingTaxRate.isDefault) {
      await prisma.taxRate.updateMany({
        where: {
          organizationId,
          isDefault: true,
          id: { not: params.id }
        },
        data: {
          isDefault: false
        }
      })
    }

    const updatedTaxRate = await prisma.taxRate.update({
      where: { id: params.id },
      data: {
        ...(name !== undefined && { name }),
        ...(taxType !== undefined && { taxType: taxType as TaxType }),
        ...(rate !== undefined && { rate: parseFloat(rate) }),
        ...(description !== undefined && { description }),
        ...(region !== undefined && { region }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json(updatedTaxRate)
  } catch (error) {
    console.error('Error updating tax rate:', error)

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
      { error: 'Failed to update tax rate' },
      { status: 500 }
    )
  }
}

// DELETE /api/tax-rates/[id] - Delete a tax rate
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, organizationId } = await getUserAndOrgOrThrow()

    // Check permission to manage organization settings
    requirePermission(user.role, 'canManageOrganization')

    // Verify the tax rate belongs to user's organization
    const existingTaxRate = await prisma.taxRate.findFirst({
      where: {
        id: params.id,
        organizationId
      }
    })

    if (!existingTaxRate) {
      return NextResponse.json({ error: 'Tax rate not found' }, { status: 404 })
    }

    // Check if tax rate is being used by any purchase orders
    const poCount = await prisma.purchaseOrder.count({
      where: {
        taxRateId: params.id
      }
    })

    if (poCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete tax rate. It is currently used by ${poCount} purchase order(s). Please deactivate it instead.` },
        { status: 400 }
      )
    }

    await prisma.taxRate.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tax rate:', error)

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
      { error: 'Failed to delete tax rate' },
      { status: 500 }
    )
  }
}
