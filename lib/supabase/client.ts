import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Get environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During SSR/build time, return a mock client to avoid errors
  if (typeof window === 'undefined' || !supabaseUrl || !supabaseAnonKey) {
    // Return a dummy client that won't be used during SSR
    return {} as any
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
