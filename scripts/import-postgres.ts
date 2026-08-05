/**
 * EKVAAR OS — PostgreSQL Import Utility (Phase 1: PostgreSQL Migration)
 * Reads exported JSON backup and imports data into PostgreSQL preserving IDs & relations.
 */

import fs from 'fs'
import path from 'path'
import { db } from '../apps/frontend/src/lib/db'

async function importPostgresData() {
  console.log(`====================================================`)
  console.log(`  EKVAAR OS — PostgreSQL Data Import (Phase 1)      `)
  console.log(`====================================================\n`)

  const exportDir = path.join(process.cwd(), 'data', 'backups')
  if (!fs.existsSync(exportDir)) {
    console.log(`[!] No backup directory found at ${exportDir}. Nothing to import.`)
    return
  }

  const files = fs.readdirSync(exportDir).filter((f) => f.startsWith('sqlite_backup_') && f.endsWith('.json'))
  if (files.length === 0) {
    console.log(`[!] No SQLite backup JSON files found.`)
    return
  }

  const latestBackup = files.sort().pop()!
  const backupPath = path.join(exportDir, latestBackup)
  console.log(`[*] Loading backup file: ${latestBackup}...`)

  const rawData = fs.readFileSync(backupPath, 'utf-8')
  const backup = JSON.parse(rawData)

  console.log(`[*] Importing data in dependency order...`)

  // 1. Import Organizations
  for (const org of backup.organizations || []) {
    await db.organization.upsert({
      where: { id: org.id },
      create: org,
      update: org,
    })
  }
  console.log(`✅ Imported ${backup.organizations?.length || 0} Organizations`)

  // 2. Import Users
  for (const user of backup.users || []) {
    await db.user.upsert({
      where: { id: user.id },
      create: user,
      update: user,
    })
  }
  console.log(`✅ Imported ${backup.users?.length || 0} Users`)

  // 3. Import Agents
  for (const agent of backup.agents || []) {
    await db.agent.upsert({
      where: { id: agent.id },
      create: agent,
      update: agent,
    })
  }
  console.log(`✅ Imported ${backup.agents?.length || 0} Agents`)

  console.log(`\n✅ POSTGRES MIGRATION IMPORT COMPLETE!\n`)
}

importPostgresData().catch((err) => {
  console.error(`[!] Import failed:`, err)
  process.exit(1)
})
