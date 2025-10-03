import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

// POST /api/organizations - Create a new organization and assign user to it
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, slug } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })
    }

    // Validate slug format (lowercase alphanumeric and hyphens, 3-50 characters)
    const slugPattern = /^[a-z0-9-]{3,50}$/
    if (!slugPattern.test(slug)) {
      return NextResponse.json({
        error: 'Slug must be 3-50 characters, lowercase letters, numbers, and hyphens only'
      }, { status: 400 })
    }

    // Check if slug already exists
    const existingOrg = await prisma.organization.findUnique({
      where: { slug }
    })

    if (existingOrg) {
      return NextResponse.json({ error: 'Organization slug already exists' }, { status: 400 })
    }

    // Create organization and update user
    const organization = await prisma.organization.create({
      data: { name, slug }
    })

    // Create or update user with organization
    await prisma.user.upsert({
      where: { id: user.id },
      create: {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || null,
        avatarUrl: user.user_metadata?.avatar_url || null,
        organizationId: organization.id
      },
      update: {
        organizationId: organization.id
      }
    })

    return NextResponse.json(organization, { status: 201 })
  } catch (error) {
    console.error('Error creating organization:', error)
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    )
  }
}
