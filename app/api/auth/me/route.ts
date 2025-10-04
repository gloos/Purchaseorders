import { NextResponse } from 'next/server'
import { getUserAndOrgOrThrow } from '@/lib/auth-helpers'

export async function GET() {
  try {
    const { user } = await getUserAndOrgOrThrow()

    return NextResponse.json({
      id: user.id,
      email: user.email,
      role: user.role
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      if (error.message === 'No organization found') {
        return NextResponse.json({ error: 'No organization found' }, { status: 404 })
      }
    }
    return NextResponse.json(
      { error: 'Failed to get user info' },
      { status: 500 }
    )
  }
}
