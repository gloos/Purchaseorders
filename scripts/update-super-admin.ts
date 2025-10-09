import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'lucegary@gmail.com'

  console.log(`Updating ${email} to SUPER_ADMIN role...`)

  const user = await prisma.user.update({
    where: { email },
    data: { role: 'SUPER_ADMIN' },
  })

  console.log(`✅ Successfully updated user:`)
  console.log(`  - Email: ${user.email}`)
  console.log(`  - Role: ${user.role}`)
  console.log(`  - Name: ${user.name}`)
}

main()
  .catch((e) => {
    console.error('Error updating user:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
