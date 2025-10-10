import { NextResponse } from 'next/server'
import { getUser } from '@/lib/auth-helpers'
import { createClient } from '@/lib/supabase/client'
import * as Sentry from '@sentry/nextjs'

export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    // Note: We need to verify current password on the client side since this is a server component
    // The actual password update happens via Supabase client
    const supabase = createClient()

    // Verify current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    })

    if (signInError) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      Sentry.captureException(updateError)
      return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Password changed successfully' })
  } catch (error) {
    Sentry.captureException(error)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}
