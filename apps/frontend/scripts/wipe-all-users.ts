import { db } from '../src/lib/db'

async function main() {
  console.log('[i] Resetting all tenant and user data...')

  await db.$transaction(async (tx) => {
    // Organization deletion cascades through every tenant-scoped model,
    // including integrations, commerce, agents, knowledge, and workspaces.
    await tx.auditLog.deleteMany()
    await tx.verificationToken.deleteMany()
    await tx.organization.deleteMany()
    await tx.user.deleteMany()
  })

  const [organizations, users, sessions, integrations, products, orders] = await Promise.all([
    db.organization.count(),
    db.user.count(),
    db.session.count(),
    db.integration.count(),
    db.product.count(),
    db.order.count(),
  ])
  const remaining = { organizations, users, sessions, integrations, products, orders }
  if (Object.values(remaining).some(Boolean)) {
    throw new Error(`Reset verification failed: ${JSON.stringify(remaining)}`)
  }

  console.log(`[ok] Tenant reset verified: ${JSON.stringify(remaining)}`)
  console.log('[ok] Global system configuration was preserved.')
}

main()
  .then(async () => {
    await db.$disconnect()
    process.exit(0)
  })
  .catch((error) => {
    console.error('[x] Reset failed:', error)
    process.exit(1)
  })
