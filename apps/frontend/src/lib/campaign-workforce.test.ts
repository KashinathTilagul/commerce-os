import assert from 'node:assert/strict'
import test from 'node:test'
import type { PrismaClient } from '@prisma/client'
import { ROSTER } from './agent-roster'
import { syncAgentRoster } from './agent-roster-sync'
import { nextCampaignLaunchCode } from './campaign-launch-code'
import { campaignOutboxKey } from './campaign-outbox-key'
import {
  assertAcyclicDependencies,
  assertCampaignItemOwner,
  assertCampaignLaunchTransition,
  assertUserManagedCampaignStatus,
} from './campaign-state'

test('keeps Krishna as CEO in the 65-person digital roster', () => {
  assert.equal(ROSTER.length, 65)
  assert.equal(new Set(ROSTER.map((agent) => agent.code)).size, 65)
  assert.equal(ROSTER.find((agent) => agent.code === 'CEO')?.name, 'Krishna')
})

test('syncs the complete roster independently into two organizations', async () => {
  const rows = new Map<string, { id: string }>()
  const fakeDb = {
    agent: {
      async upsert({ where, create }: any) {
        const key = `${where.organizationId_code.organizationId}:${where.organizationId_code.code}`
        const row = rows.get(key) ?? { id: `agent-${rows.size + 1}`, ...create }
        rows.set(key, row)
        return row
      },
    },
  } as unknown as Pick<PrismaClient, 'agent'>

  assert.equal(await syncAgentRoster(fakeDb, 'org-a'), 65)
  assert.equal(await syncAgentRoster(fakeDb, 'org-b'), 65)
  assert.equal(rows.size, 130)
  assert.ok(rows.has('org-a:CEO'))
  assert.ok(rows.has('org-b:CEO'))
})

test('allocates tenant-local campaign codes and stable outbox IDs', () => {
  assert.equal(nextCampaignLaunchCode([]), 'CL-001')
  assert.equal(nextCampaignLaunchCode(['CL-001', 'CL-009', 'other']), 'CL-010')
  assert.equal(
    campaignOutboxKey('launch-1', 'CAMPAIGN_LAUNCH_CREATED', 1),
    'campaign-launch-created-launch-1-v1',
  )
})

test('rejects illegal campaign transitions and accepts resumable blocked work', () => {
  assert.doesNotThrow(() => assertCampaignLaunchTransition('DRAFT', 'PLANNING'))
  assert.doesNotThrow(() => assertCampaignLaunchTransition('BLOCKED', 'EXECUTING'))
  assert.throws(() => assertCampaignLaunchTransition('DRAFT', 'PUBLISHED'), /cannot move/)
  assert.throws(() => assertCampaignLaunchTransition('PUBLISHED', 'EXECUTING'), /cannot move/)
  assert.throws(() => assertUserManagedCampaignStatus('APPROVED'), /coordinators/)
  assert.doesNotThrow(() => assertUserManagedCampaignStatus('APPROVAL_PENDING'))
})

test('enforces exactly one campaign item owner', () => {
  assert.doesNotThrow(() => assertCampaignItemOwner({ assigneeType: 'AGENT', assigneeId: 'agent-1' }))
  assert.doesNotThrow(() => assertCampaignItemOwner({ assigneeType: 'SYSTEM', serviceKey: 'COMMERCE_PREPARER' }))
  assert.throws(() => assertCampaignItemOwner({ assigneeType: 'AGENT' }), /require assigneeId/)
  assert.throws(
    () => assertCampaignItemOwner({ assigneeType: 'SYSTEM', assigneeId: 'agent-1', serviceKey: 'svc' }),
    /cannot set assigneeId/,
  )
})

test('rejects duplicate, self, missing-item, and cyclic dependencies', () => {
  const items = ['01', '02', '03']
  assert.doesNotThrow(() => assertAcyclicDependencies(items, [
    { itemId: '02', dependsOnId: '01' },
    { itemId: '03', dependsOnId: '02' },
  ]))
  assert.throws(() => assertAcyclicDependencies(items, [{ itemId: '01', dependsOnId: '01' }]), /themselves/)
  assert.throws(() => assertAcyclicDependencies(items, [{ itemId: '04', dependsOnId: '01' }]), /same launch/)
  assert.throws(() => assertAcyclicDependencies(items, [
    { itemId: '02', dependsOnId: '01' },
    { itemId: '02', dependsOnId: '01' },
  ]), /Duplicate/)
  assert.throws(() => assertAcyclicDependencies(items, [
    { itemId: '02', dependsOnId: '01' },
    { itemId: '03', dependsOnId: '02' },
    { itemId: '01', dependsOnId: '03' },
  ]), /cycle/)
})
