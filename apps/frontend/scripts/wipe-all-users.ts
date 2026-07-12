import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  console.log('[i] Wiping all user accounts...')
  
  const sessionCount = await db.session.deleteMany()
  console.log(`[✓] Deleted ${sessionCount.count} sessions`)
  
  const accountCount = await db.account.deleteMany()
  console.log(`[✓] Deleted ${accountCount.count} accounts`)
  
  const auditCount = await db.auditLog.deleteMany()
  console.log(`[✓] Deleted ${auditCount.count} audit logs`)
  
  const prefCount = await db.userPreference.deleteMany()
  console.log(`[✓] Deleted ${prefCount.count} user preferences`)
  
  const userCount = await db.user.deleteMany()
  console.log(`[✓] Deleted ${userCount.count} users`)
  
  const tokenCount = await db.verificationToken.deleteMany()
  console.log(`[✓] Deleted ${tokenCount.count} verification tokens`)
  
  const systemCount = await db.systemSetting.deleteMany()
  console.log(`[✓] Deleted ${systemCount.count} system settings`)
  
  console.log('\n[✓] All user accounts wiped. Ready for fresh signup.')
}

main()
  .catch((e) => {
    console.error('[✗] Error:', e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
