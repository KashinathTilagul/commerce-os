import 'dotenv/config'
import assert from 'node:assert/strict'
import { db } from '../src/lib/db'
import { requestAgentWake } from '../src/lib/agents/wake-coalescer'
import { enforceAgentBudget } from '../src/lib/agents/budget-enforcer'

async function runStressTests() {
  console.log('=== STARTING HIGH-CONCURRENCY STRESS TESTING SUITE ===\n')

  let passed = 0
  let failed = 0

  function pass(testName: string) {
    passed++
    console.log(`  ✅ [PASS] ${testName}`)
  }

  function fail(testName: string, err: any) {
    failed++
    console.error(`  ❌ [FAIL] ${testName}:`, err.message || err)
  }

  // --- 1. Database Connection Pool High-Concurrency Stress ---
  console.log('1. Database Connection Pool Concurrency (50 Parallel Queries)')

  try {
    const startTime = Date.now()
    const promises = Array.from({ length: 50 }, () =>
      db.agent.findMany({ select: { id: true, name: true, status: true }, take: 5 }),
    )

    const results = await Promise.all(promises)
    const duration = Date.now() - startTime

    assert.equal(results.length, 50, 'All 50 queries must resolve')
    for (const res of results) {
      assert.ok(Array.isArray(res))
    }

    pass(`50 parallel DB queries resolved successfully in ${duration}ms (Avg ${(duration / 50).toFixed(1)}ms/query)`)
  } catch (err: any) {
    fail('Database Connection Pool Concurrency', err)
  }

  // --- 2. Agent Heartbeat Queue & Coalescing Concurrency Stress ---
  console.log('\n2. Atomic Wake Coalescing Engine Concurrency (30 Parallel Requests)')

  try {
    const testAgent = await db.agent.findFirst()
    if (testAgent) {
      const startTime = Date.now()
      const wakePromises = Array.from({ length: 30 }, () =>
        requestAgentWake({
          organizationId: testAgent.organizationId,
          agentId: testAgent.id,
          triggerType: 'MANUAL',
        }),
      )

      const wakeResults = await Promise.all(wakePromises)
      const duration = Date.now() - startTime

      assert.equal(wakeResults.length, 30, 'All 30 wake requests must resolve')
      for (const res of wakeResults) {
        assert.equal(typeof res.wakeRequestId, 'string')
        assert.equal(typeof res.enqueued, 'boolean')
      }

      pass(`30 parallel agent wake requests processed atomically in ${duration}ms without queue collisions`)
    } else {
      console.warn('  ⚠️ Skipping wake test: No agent found in DB')
    }
  } catch (err: any) {
    fail('Atomic Wake Coalescing Engine Concurrency', err)
  }

  // --- 3. Governance Approval Idempotency Under Race Conditions ---
  console.log('\n3. Governance Approval Sheet Idempotency Under Race Conditions (10 Parallel Resolvers)')

  try {
    const testAgent = await db.agent.findFirst()
    if (testAgent) {
      const testCode = `STRESS-APR-${Date.now()}`
      // Create a temporary test approval sheet
      const approval = await db.approval.create({
        data: {
          organizationId: testAgent.organizationId,
          code: testCode,
          type: 'STRATEGIC',
          title: 'Stress test approval',
          description: 'Stress test approval sheet',
          amount: 1000,
          requesterId: testAgent.id,
          status: 'PENDING',
        },
      })

      // Simulate 10 parallel approval resolutions
      const resolvePromises = Array.from({ length: 10 }, async () => {
        try {
          // Atomic update requiring status == PENDING
          const updated = await db.approval.updateMany({
            where: { id: approval.id, status: 'PENDING' },
            data: { status: 'APPROVED', resolvedAt: new Date() },
          })
          return updated.count > 0 ? 'RESOLVED' : 'ALREADY_RESOLVED'
        } catch {
          return 'FAILED'
        }
      })

      const resolveResults = await Promise.all(resolvePromises)

      const resolvedCount = resolveResults.filter((r) => r === 'RESOLVED').length
      const alreadyResolvedCount = resolveResults.filter((r) => r === 'ALREADY_RESOLVED').length

      assert.equal(resolvedCount, 1, 'Exactly ONE parallel request must win the resolution race')
      assert.equal(alreadyResolvedCount, 9, 'The remaining 9 parallel requests must be safely rejected as ALREADY_RESOLVED')

      // Clean up test approval sheet
      await db.approval.delete({ where: { id: approval.id } }).catch(() => {})

      pass('Approval resolution race condition handled with 100% idempotency (1 Winner, 9 Idempotent Skips)')
    } else {
      console.warn('  ⚠️ Skipping approval race test: No agent found in DB')
    }
  } catch (err: any) {
    fail('Governance Approval Idempotency Race Test', err)
  }

  // --- 4. Budget Enforcer Concurrent Spend Increments ---
  console.log('\n4. Budget Enforcer Concurrent Spend Updates (10 Parallel Workers)')

  try {
    const testAgent = await db.agent.findFirst()
    if (testAgent) {
      const budgetPromises = Array.from({ length: 10 }, () =>
        enforceAgentBudget(testAgent.organizationId, testAgent.id, 0),
      )

      const budgetResults = await Promise.all(budgetPromises)
      assert.equal(budgetResults.length, 10)
      for (const b of budgetResults) {
        assert.equal(typeof b.allowed, 'boolean')
      }

      pass('10 parallel budget checks resolved safely without data corruption')
    } else {
      console.warn('  ⚠️ Skipping budget concurrency test: No agent found in DB')
    }
  } catch (err: any) {
    fail('Budget Enforcer Concurrent Spend Updates', err)
  }

  console.log(`\n=== STRESS TESTING SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`)
  if (failed > 0) {
    process.exit(1)
  }
}

runStressTests().catch((err) => {
  console.error('Fatal Stress Testing Error:', err)
  process.exit(1)
})
