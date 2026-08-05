/**
 * EKVAAR OS — SQLite Data Export Utility (Phase 1: PostgreSQL Migration)
 * Exports all Organization, User, Agent, Issue, Event, and Artifact records to JSON backup.
 */

import fs from 'fs'
import path from 'path'
import { db } from '../apps/frontend/src/lib/db'

async function exportSqliteData() {
  console.log(`====================================================`)
  console.log(`  EKVAAR OS — SQLite Backup & Export (Phase 1)      `)
  console.log(`====================================================\n`)

  const exportDir = path.join(process.cwd(), 'data', 'backups')
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const exportPath = path.join(exportDir, `sqlite_backup_${timestamp}.json`)

  console.log(`[*] Fetching entities from SQLite database...`)

  const organizations = await db.organization.findMany()
  const users = await db.user.findMany()
  const agents = await db.agent.findMany()
  const issues = await db.issue.findMany()
  const events = await db.event.findMany()

  const backupData = {
    metadata: {
      exportedAt: new Date().toISOString(),
      version: 'v3.3.2-postgres-foundation',
      counts: {
        organizations: organizations.length,
        users: users.length,
        agents: agents.length,
        issues: issues.length,
        events: events.length,
      },
    },
    organizations,
    users,
    agents,
    issues,
    events,
  }

  fs.writeFileSync(exportPath, JSON.stringify(backupData, null, 2), 'utf-8')

  console.log(`✅ EXPORT SUCCESSFUL!`)
  console.log(`   Export File: ${exportPath}`)
  console.log(`   Organizations: ${organizations.length}`)
  console.log(`   Users: ${users.length}`)
  console.log(`   Agents: ${agents.length}`)
  console.log(`   Issues: ${issues.length}`)
  console.log(`   Events: ${events.length}\n`)
}

exportSqliteData().catch((err) => {
  console.error(`[!] Export failed:`, err)
  process.exit(1)
})
