import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { updatePurchaseOrderSchema, validateRequestBody } from '@/lib/validations'

// GET /api/purchase-orders/[id] - Get a single purchase order
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id: params.id,
        organizationId: dbUser.organizationId
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Verify the PO belongs to user's organization
    const existingPO = await prisma.purchaseOrder.findFirst({
      where: {
        id: params.id,
        organizationId: dbUser.organizationId
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

    // If line items are provided, recalculate total
    let totalAmount = poData.totalAmount
    if (lineItems) {
      totalAmount = lineItems.reduce((sum: number, item: any) => {
        return sum + (item.quantity * parseFloat(item.unitPrice))
      }, 0)
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
          // Always set totalAmount if calculated from line items, even if 0
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
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Verify the PO belongs to user's organization
    const existingPO = await prisma.purchaseOrder.findFirst({
      where: {
        id: params.id,
        organizationId: dbUser.organizationId
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
    return NextResponse.json(
      { error: 'Failed to delete purchase order' },
      { status: 500 }
    )
  }
}
