import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
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
 * Redirects to setup if user has no organization
 */
export async function requireAuth() {
  const user = await getUser()
  if (!user) {
    redirect('/signin')
  }

  // Check if user has an organization
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    include: { organization: true }
  })

  // If user exists but has no organization, redirect to setup
  if (dbUser && !dbUser.organizationId) {
    redirect('/setup')
  }

  // If user doesn't exist in DB yet, create them and redirect to setup
  if (!dbUser) {
    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email!,
        name: user.user_metadata?.name || null,
        avatarUrl: user.user_metadata?.avatar_url || null
      }
    })
    redirect('/setup')
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
