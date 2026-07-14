import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  await db.integration.deleteMany()
  console.log('[✓] Integrations connections reset')
}

main().finally(() => db.$disconnect())
