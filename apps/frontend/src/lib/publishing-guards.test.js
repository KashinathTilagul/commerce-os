import { test, mock } from 'bun:test'
import assert from 'node:assert/strict'

let approved = null
const sent = []
mock.module('./db', () => ({ db: {
  marketingTask: { findFirst: async () => approved, update: async () => ({ id: 'task-1' }) },
  event: { create: async () => {} },
} }))
mock.module('./social-publisher', () => ({ publishEntry: async (_org, entry) => { sent.push(entry); return { id: 'receipt' } } }))
mock.module('./artifact-public', () => ({ publicArtifactUrl: (_base, id) => id }))
mock.module('./scheduler-lock', () => ({ withSchedulerLock: async (_name, work) => work() }))
const { publishMarketingTask } = await import('./marketing-task-publisher')

test('unapproved tasks cannot publish; approved persisted content replaces caller input', async () => {
  const task = { id: 'task-1', organizationId: 'org-1', content: 'caller text', hashtags: [], platforms: ['instagram'], format: 'image', mediaArtifactIds: ['asset'] }
  await assert.rejects(publishMarketingTask(task), /approval/)
  assert.equal(sent.length, 0)
  approved = { ...task, content: 'approved text', approvedAt: new Date(), status: 'APPROVED' }
  await publishMarketingTask(task)
  assert.equal(sent[0].caption, 'approved text')
})
