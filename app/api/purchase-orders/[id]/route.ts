import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { updatePurchaseOrderSchema, validateRequestBody } from '@/lib/validations'
import { calculateTax } from '@/lib/tax-helpers'

// GET /api/purchase-orders/[id] - Get a single purchase order
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { getUserAndOrgOrThrow } = await import('@/lib/auth-helpers')
    const { user, organizationId } = await getUserAndOrgOrThrow()

    // Check permission to view POs
    const { requirePermission } = await import('@/lib/rbac')
    requirePermission(user.role, 'canViewPO')

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id: params.id,
        organizationId
      },
      include: {
        lineItems: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    return NextResponse.json(purchaseOrder)
  } catch (error) {
    console.error('Error fetching purchase order:', error)

    // Import AuthorizationError
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
      { error: 'Failed to fetch purchase order' },
      { status: 500 }
    )
  }
}

// PATCH /api/purchase-orders/[id] - Update a purchase order
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { getUserAndOrgOrThrow } = await import('@/lib/auth-helpers')
    const { user, organizationId } = await getUserAndOrgOrThrow()

    // Check permission to edit POs
    const { requirePermission } = await import('@/lib/rbac')
    requirePermission(user.role, 'canEditPO')

    // Verify the PO belongs to user's organization
    const existingPO = await prisma.purchaseOrder.findFirst({
      where: {
        id: params.id,
        organizationId
      }
    })

    if (!existingPO) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    const body = await request.json()

    // Validate request body
    const validation = validateRequestBody(updatePurchaseOrderSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { lineItems, ...poData } = validation.data

    // Date conversion is now handled by Zod validation schema

    // If line items or tax settings are provided, recalculate totals
    let subtotalAmount: number | undefined
    let taxAmount: number | undefined
    let totalAmount: number | undefined

    if (lineItems) {
      // Tax settings from request or use existing PO values
      const taxMode = poData.taxMode || existingPO.taxMode
      const taxRate = poData.taxRate !== undefined ? poData.taxRate : existingPO.taxRate

      const taxCalc = calculateTax(lineItems, taxMode, Number(taxRate))
      subtotalAmount = taxCalc.subtotalAmount
      taxAmount = taxCalc.taxAmount
      totalAmount = taxCalc.totalAmount
    } else if (poData.taxMode !== undefined || poData.taxRate !== undefined) {
      // Tax settings changed but line items not provided - need to recalculate from existing line items
      const existingLineItems = await prisma.pOLineItem.findMany({
        where: { purchaseOrderId: params.id }
      })

      const taxMode = poData.taxMode || existingPO.taxMode
      const taxRate = poData.taxRate !== undefined ? poData.taxRate : existingPO.taxRate

      const taxCalc = calculateTax(existingLineItems, taxMode, Number(taxRate))
      subtotalAmount = taxCalc.subtotalAmount
      taxAmount = taxCalc.taxAmount
      totalAmount = taxCalc.totalAmount
    }

    // Use transaction to ensure atomic updates
    const purchaseOrder = await prisma.$transaction(async (tx) => {
      // Delete existing line items if new ones are provided
      if (lineItems) {
        await tx.pOLineItem.deleteMany({
          where: { purchaseOrderId: params.id }
        })
      }

      // Update purchase order
      return await tx.purchaseOrder.update({
        where: { id: params.id },
        data: {
          ...poData,
          // Always set calculated amounts if they were computed
          ...(subtotalAmount !== undefined && { subtotalAmount }),
          ...(taxAmount !== undefined && { taxAmount }),
          ...(totalAmount !== undefined && { totalAmount }),
          ...(lineItems && {
            lineItems: {
              create: lineItems.map((item: any) => ({
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.quantity * parseFloat(item.unitPrice),
                notes: item.notes
              }))
            }
          })
        },
        include: {
          lineItems: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })
    })

    return NextResponse.json(purchaseOrder)
  } catch (error) {
    console.error('Error updating purchase order:', error)

    // Import AuthorizationError
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
      { error: 'Failed to update purchase order' },
      { status: 500 }
    )
  }
}

// DELETE /api/purchase-orders/[id] - Delete a purchase order
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { getUserAndOrgOrThrow } = await import('@/lib/auth-helpers')
    const { user, organizationId } = await getUserAndOrgOrThrow()

    // Check permission to delete POs
    const { requirePermission } = await import('@/lib/rbac')
    requirePermission(user.role, 'canDeletePO')

    // Verify the PO belongs to user's organization
    const existingPO = await prisma.purchaseOrder.findFirst({
      where: {
        id: params.id,
        organizationId
      }
    })

    if (!existingPO) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    await prisma.purchaseOrder.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting purchase order:', error)

    // Import AuthorizationError
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
      { error: 'Failed to delete purchase order' },
      { status: 500 }
    )
  }
}
