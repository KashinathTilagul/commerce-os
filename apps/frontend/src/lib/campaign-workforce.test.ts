import assert from 'node:assert/strict'
import test from 'node:test'
import type { PrismaClient } from '@prisma/client'
import { ROSTER } from './agent-roster'
import { syncAgentRoster } from './agent-roster-sync'
import { nextCampaignLaunchCode } from './campaign-launch-code'
import { campaignOutboxKey } from './campaign-outbox-key'
import { hashCampaignEvidence } from './campaign-evidence-hash'
import { extractExactReply, parseGeneratedMediaJSON, planWorkRequest, shouldExecuteMedia } from './work-request-planner'
import { CAMPAIGN_ITEMS, CAMPAIGN_VALIDATIONS } from './campaign-blueprint'
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

test('hashes frozen campaign evidence independently of object key order', () => {
  const first = { launch: { code: 'CL-001', title: 'Launch' }, items: [{ code: '01', status: 'COMPLETED' }] }
  const reordered = { items: [{ status: 'COMPLETED', code: '01' }], launch: { title: 'Launch', code: 'CL-001' } }
  assert.equal(hashCampaignEvidence(first), hashCampaignEvidence(reordered))
  assert.notEqual(hashCampaignEvidence(first), hashCampaignEvidence({ ...first, items: [{ code: '01', status: 'BLOCKED' }] }))
})

test('plans only the work requested and reserves the full graph for campaigns', () => {
  assert.deepEqual(planWorkRequest('Reply with exactly TESTING').items.map((item) => item.type), ['ANSWER'])
  assert.deepEqual(planWorkRequest('Write an email for an investor').items.map((item) => item.type), ['CONTENT'])
  assert.deepEqual(planWorkRequest('Create an image and a PDF report').items.map((item) => item.type), ['IMAGE', 'PDF'])
  assert.deepEqual(planWorkRequest('Create a short audio file').items.map((item) => item.type), ['AUDIO'])
  assert.deepEqual(planWorkRequest('What is current revenue?').items.map((item) => item.type), ['FINANCE_QUERY'])
  assert.equal(planWorkRequest('Launch a new collection campaign on Instagram and Shopify').items.length, 14)
})

test('extracts exact reply requests without spending another model call', () => {
  assert.equal(extractExactReply('Reply with exactly: TESTING'), 'TESTING')
  assert.equal(extractExactReply('Get me the output as a reply as: READY, this is a test'), 'READY, this is a test')
  assert.equal(extractExactReply('What is current revenue?'), null)
})

test('executes only the media type selected by the request planner', () => {
  assert.equal(shouldExecuteMedia('PDF', 'PDF'), true)
  assert.equal(shouldExecuteMedia('PDF', 'IMAGE'), false)
  assert.equal(shouldExecuteMedia('FINANCE_QUERY', 'IMAGE'), false)
  assert.equal(shouldExecuteMedia(undefined, 'IMAGE'), true)
})

test('parses model media JSON containing literal control characters in strings', () => {
  const parsed = parseGeneratedMediaJSON<{ data: { summary: string } }>(
    '{"data":{"summary":"line one\nline two\tready"}}',
  )
  assert.equal(parsed.data.summary, 'line one\nline two\tready')
})

test('campaign blueprint is a complete acyclic 14-item employee workflow', () => {
  assert.equal(CAMPAIGN_ITEMS.length, 14)
  assert.equal(CAMPAIGN_VALIDATIONS.length, 8)
  const seen = new Set<string>()
  for (const item of CAMPAIGN_ITEMS) {
    assert.ok(item.dependsOn.every((dependency) => seen.has(dependency)), `${item.code} has a forward or missing dependency`)
    seen.add(item.code)
  }
  assert.deepEqual([...seen], Array.from({ length: 14 }, (_, index) => String(index + 1).padStart(2, '0')))
})

test('rejects illegal campaign transitions and accepts resumable blocked work', () => {
  assert.doesNotThrow(() => assertCampaignLaunchTransition('DRAFT', 'PLANNING'))
  assert.doesNotThrow(() => assertCampaignLaunchTransition('BLOCKED', 'EXECUTING'))
  assert.doesNotThrow(() => assertCampaignLaunchTransition('PUBLISHED', 'CANCELLED'))
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
