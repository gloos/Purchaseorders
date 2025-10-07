import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Get environment variables with fallbacks for build time
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  // Only validate at runtime, not during build
  if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}
