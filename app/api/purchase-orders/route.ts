import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { generatePONumber } from '@/lib/counter-helpers'
import { createPurchaseOrderSchema, validateRequestBody } from '@/lib/validations'

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

    // Validate request body
    const validation = validateRequestBody(createPurchaseOrderSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { lineItems, ...poData } = validation.data

    // Generate PO number if not provided (atomic, race-condition safe)
    if (!poData.poNumber) {
      poData.poNumber = await generatePONumber(dbUser.organizationId)
    }

    // Date conversion is now handled by Zod validation schema

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
