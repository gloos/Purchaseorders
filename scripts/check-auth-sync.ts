import { createClient } from '@supabase/supabase-js'
import { prisma } from '../lib/prisma'
import * as dotenv from 'dotenv'

dotenv.config()

async function checkAuthSync() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Get all Supabase auth users
    const { data: authUsers, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error('Error fetching auth users:', error)
      return
    }

    console.log('\n=== Supabase Auth Users ===\n')

    for (const authUser of authUsers.users) {
      console.log('Auth User ID:', authUser.id)
      console.log('Email:', authUser.email)
      console.log('Email Confirmed:', authUser.email_confirmed_at ? '✅' : '❌')
      console.log('Created:', authUser.created_at)

      // Check if this user exists in Prisma database
      const prismaUser = await prisma.user.findUnique({
        where: { id: authUser.id }
      })

      if (prismaUser) {
        console.log('✅ Found in database')
        console.log('  DB Role:', prismaUser.role)
        console.log('  DB Org ID:', prismaUser.organizationId || '(none)')
      } else {
        console.log('❌ NOT found in database!')
      }
      console.log('---')
    }

    // Check for Prisma users not in Auth
    console.log('\n=== Checking Database Users ===\n')

    const allDbUsers = await prisma.user.findMany()

    for (const dbUser of allDbUsers) {
      const authUser = authUsers.users.find(u => u.id === dbUser.id)

      if (!authUser) {
        console.log('❌ Database user not in Auth:')
        console.log('  ID:', dbUser.id)
        console.log('  Email:', dbUser.email)
        console.log('  Role:', dbUser.role)
      }
    }

    console.log('\n✅ Check complete')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAuthSync()