import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

/**
 * Get the current authenticated user
 * Returns the user or null if not authenticated
 */
export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Require authentication for a page
 * Redirects to sign in if not authenticated
 */
export async function requireAuth() {
  const user = await getUser()
  if (!user) {
    redirect('/signin')
  }
  return user
}

/**
 * Check if user is authenticated
 * Returns true if authenticated, false otherwise
 */
export async function isAuthenticated() {
  const user = await getUser()
  return !!user
}

/**
 * Redirect to dashboard if already authenticated
 * Useful for signin/signup pages
 */
export async function redirectIfAuthenticated() {
  const user = await getUser()
  if (user) {
    redirect('/dashboard')
  }
}
