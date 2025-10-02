import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

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
    const { lineItems, ...poData } = body

    // Convert date strings to ISO DateTime
    if (poData.orderDate) {
      poData.orderDate = new Date(poData.orderDate).toISOString()
    }
    if (poData.deliveryDate) {
      poData.deliveryDate = new Date(poData.deliveryDate).toISOString()
    }

    // If line items are provided, recalculate total
    let totalAmount = poData.totalAmount
    if (lineItems) {
      totalAmount = lineItems.reduce((sum: number, item: any) => {
        return sum + (item.quantity * parseFloat(item.unitPrice))
      }, 0)

      // Delete existing line items and create new ones
      await prisma.pOLineItem.deleteMany({
        where: { purchaseOrderId: params.id }
      })
    }

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id: params.id },
      data: {
        ...poData,
        ...(totalAmount && { totalAmount }),
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
