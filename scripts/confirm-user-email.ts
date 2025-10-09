import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// Manually confirm a user's email
async function confirmUserEmail() {
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
    console.error('Usage: tsx scripts/confirm-user-email.ts <email>')
    process.exit(1)
  }

  console.log(`Looking up user: ${email}`)

  // Get user by email
  const { data, error } = await supabase.auth.admin.listUsers()

  if (error) {
    console.error('Error fetching users:', error)
    process.exit(1)
  }

  const user = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (!user) {
    console.log(`❌ User not found: ${email}`)
    process.exit(1)
  }

  console.log(`Found user: ${user.id}`)
  console.log(`Current email_confirmed_at: ${user.email_confirmed_at || 'Not confirmed'}`)

  // Confirm the email
  console.log('\nConfirming email...')
  const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { email_confirm: true }
  )

  if (updateError) {
    console.error('❌ Error confirming email:', updateError)
    process.exit(1)
  }

  console.log('✅ Email confirmed successfully!')
  console.log(`New email_confirmed_at: ${updateData.user.email_confirmed_at}`)
  console.log(`\nUser can now log in with: ${email}`)
}

confirmUserEmail().catch(console.error)
