import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// GET /api/contacts - Get all contacts for user's organization
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { organizationId: true }
    })

    if (!dbUser?.organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    const contacts = await prisma.contact.findMany({
      where: {
        organizationId: dbUser.organizationId
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(contacts)
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}
