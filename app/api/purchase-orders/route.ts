import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET /api/purchase-orders - List all purchase orders for user's organization
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { organization: true }
    })

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where: {
        organizationId: dbUser.organizationId,
        ...(status && { status: status as any })
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        lineItems: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(purchaseOrders)
  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
      { status: 500 }
    )
  }
}

// POST /api/purchase-orders - Create a new purchase order
export async function POST(request: Request) {
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

    const body = await request.json()
    const { lineItems, ...poData } = body

    // Generate PO number if not provided
    if (!poData.poNumber) {
      const count = await prisma.purchaseOrder.count({
        where: { organizationId: dbUser.organizationId }
      })
      poData.poNumber = `PO-${String(count + 1).padStart(5, '0')}`
    }

    // Convert date strings to ISO DateTime
    if (poData.orderDate) {
      poData.orderDate = new Date(poData.orderDate).toISOString()
    }
    if (poData.deliveryDate) {
      poData.deliveryDate = new Date(poData.deliveryDate).toISOString()
    }

    // Calculate total from line items
    const totalAmount = lineItems.reduce((sum: number, item: any) => {
      return sum + (item.quantity * parseFloat(item.unitPrice))
    }, 0)

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        ...poData,
        totalAmount,
        organizationId: dbUser.organizationId,
        createdById: user.id,
        lineItems: {
          create: lineItems.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * parseFloat(item.unitPrice),
            notes: item.notes
          }))
        }
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

    return NextResponse.json(purchaseOrder, { status: 201 })
  } catch (error) {
    console.error('Error creating purchase order:', error)
    return NextResponse.json(
      { error: 'Failed to create purchase order' },
      { status: 500 }
    )
  }
}
