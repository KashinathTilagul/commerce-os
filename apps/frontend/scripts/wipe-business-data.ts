// Wipes all business data. Used once locally (before pushing the tenant-scoping
// schema change, which adds required userId columns that can't apply against
// non-empty tables) and once in prod via .github/workflows/wipe-prod-data.yml.
// Deletes child tables before parents to satisfy FK constraints.
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  await db.orderItem.deleteMany()
  await db.issueComment.deleteMany()
  await db.toolExecution.deleteMany()
  await db.event.deleteMany()
  await db.approval.deleteMany()
  await db.issue.deleteMany()
  await db.agent.deleteMany()
  await db.order.deleteMany()
  await db.product.deleteMany()
  await db.customer.deleteMany()
  await db.transaction.deleteMany()
  await db.campaign.deleteMany()
  await db.founderNote.deleteMany()
  await db.restoration.deleteMany()
  await db.supplier.deleteMany()
  await db.aISystem.deleteMany()
  await db.brandCheck.deleteMany()
  await db.integration.deleteMany()
  console.log('[✓] Business data wiped')
}

main().finally(() => db.$disconnect())
