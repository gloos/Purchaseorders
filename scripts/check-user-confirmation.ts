import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Check user email confirmation status
async function checkUserConfirmation() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not set')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  // Get the email from command line argument
  const email = process.argv[2]

  if (!email) {
    console.error('Usage: tsx scripts/check-user-confirmation.ts <email>')
    process.exit(1)
  }

  console.log(`Checking user confirmation for: ${email}`)

  // Get user by email
  const { data, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('Error fetching users:', error)
    process.exit(1)
  }

  const user = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (!user) {
    console.log(`❌ User not found in Supabase Auth: ${email}`)
    process.exit(0)
  }

  console.log('\n✅ User found in Supabase Auth:')
  console.log(`   ID: ${user.id}`)
  console.log(`   Email: ${user.email}`)
  console.log(`   Email confirmed: ${user.email_confirmed_at ? '✅ YES' : '❌ NO'}`)
  console.log(`   Email confirmed at: ${user.email_confirmed_at || 'Never'}`)
  console.log(`   Created at: ${user.created_at}`)
  console.log(`   Last sign in: ${user.last_sign_in_at || 'Never'}`)
}

checkUserConfirmation().catch(console.error)
