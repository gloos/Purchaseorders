import { prisma } from '../lib/prisma'

async function checkSuperAdmin() {
  try {
    // Find all SUPER_ADMIN users
    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      include: {
        organization: true
      }
    })

    console.log('\n=== SUPER_ADMIN Users ===\n')

    for (const user of superAdmins) {
      console.log('User ID:', user.id)
      console.log('Email:', user.email)
      console.log('Name:', user.name || '(not set)')
      console.log('Role:', user.role)
      console.log('Organization ID:', user.organizationId || '(not set)')
      console.log('Organization:', user.organization?.name || '(no organization)')
      console.log('Created:', user.createdAt)
      console.log('Updated:', user.updatedAt)
      console.log('---')
    }

    // Check for any users without organizations
    const usersWithoutOrg = await prisma.user.findMany({
      where: {
        organizationId: null
      }
    })

    if (usersWithoutOrg.length > 0) {
      console.log('\n⚠️  WARNING: Users without organizations:')
      usersWithoutOrg.forEach(u => {
        console.log(`- ${u.email} (${u.role})`)
      })
    }

    // Check for any data inconsistencies
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true
      }
    })

    console.log('\n=== All Users Summary ===')
    console.log('Total users:', allUsers.length)

    const byRole = allUsers.reduce((acc, u) => {
      acc[u.role] = (acc[u.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    console.log('By role:', byRole)

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkSuperAdmin()