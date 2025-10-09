import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  await supabase.auth.signOut()

  // Use 303 status to force GET method on redirect (prevents 405 error)
  return NextResponse.redirect(new URL('/signin', request.url), 303)
}
