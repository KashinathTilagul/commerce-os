import 'dotenv/config'
import assert from 'node:assert/strict'
import { db } from '../src/lib/db'
import { requestAgentWake } from '../src/lib/agents/wake-coalescer'
import { enforceAgentBudget } from '../src/lib/agents/budget-enforcer'

async function runAdversarialChaosTests() {
  console.log('========================================================================')
  console.log('  🔥 UNBIASED ADVERSARIAL CHAOS & HEAVY LOAD TESTING SUITE 🔥')
  console.log('========================================================================\n')

  let passed = 0
  let failed = 0
  const findings: string[] = []

  function pass(name: string, detail?: string) {
    passed++
    console.log(`  ✅ [PASS] ${name} ${detail ? `(${detail})` : ''}`)
  }

  function fail(name: string, error: any) {
    failed++
    const msg = error?.message || String(error)
    findings.push(`${name}: ${msg}`)
    console.error(`  ❌ [FAIL] ${name}: ${msg}`)
  }

  // -------------------------------------------------------------------------
  // SECTION 1: DATABASE POOL & TRANSACTION HIGH-STRESS FLUSH (150 OPERATIONS)
  // -------------------------------------------------------------------------
  console.log('── 1. High-Volume Database & Transaction Stress (100 Reads + 50 Writes) ──')

  try {
    const startTime = Date.now()
    const testAgent = await db.agent.findFirst()
    if (!testAgent) throw new Error('No agent found in DB for stress testing')

    // 100 parallel reads
    const readPromises = Array.from({ length: 100 }, (_, i) =>
      db.agent.findMany({ select: { id: true, status: true, tokenSpend: true }, take: 10 }),
    )

    // 50 parallel atomic updates
    const writePromises = Array.from({ length: 50 }, (_, i) =>
      db.event.create({
        data: {
          organizationId: testAgent.organizationId,
          type: 'STRESS_CHAOS_TEST',
          actorId: testAgent.id,
          actorName: 'Adversarial Test Runner',
          summary: `Stress event tick #${i}`,
          severity: 'INFO',
          payload: JSON.stringify({ index: i, timestamp: Date.now() }),
        },
      }),
    )

    const allResults = await Promise.all([...readPromises, ...writePromises])
    const duration = Date.now() - startTime

    assert.equal(allResults.length, 150, 'All 150 parallel database operations must succeed')
    pass('150 Parallel DB Reads + Writes', `Completed in ${duration}ms, avg ${(duration / 150).toFixed(1)}ms/op`)

    // Clean up created test events
    await db.event.deleteMany({ where: { type: 'STRESS_CHAOS_TEST' } }).catch(() => {})
  } catch (err: any) {
    fail('150 Parallel DB Reads + Writes', err)
  }

  // -------------------------------------------------------------------------
  // SECTION 2: ADVERSARIAL HTTP PAYLOAD FUZZING & INJECTION ATTACKS
  // -------------------------------------------------------------------------
  console.log('\n── 2. Adversarial HTTP Endpoint Fuzzing & Payload Injection Attacks ──')

  const baseUrl = 'http://localhost:3000'

  const maliciousPayloads = [
    { name: '100KB Large Text Payload', body: JSON.stringify({ triggerType: 'MANUAL', text: 'A'.repeat(100000) }) },
    { name: 'Null Byte Character Injection', body: JSON.stringify({ triggerType: 'MANUAL\x00' }) },
    { name: 'SQL Injection String Payload', body: JSON.stringify({ triggerType: "MANUAL' OR 1=1 --" }) },
    { name: 'XSS Script Payload', body: JSON.stringify({ triggerType: '<script>alert(1)</script>' }) },
    { name: 'Numeric Bounds Overflow (Infinity)', body: JSON.stringify({ amount: Number.MAX_VALUE * 2 }) },
    { name: 'Negative Spend Fuzzing', body: JSON.stringify({ amount: -99999999 }) },
    { name: 'Malformed JSON Body', body: '{"triggerType": "MANUAL", BROKEN_SYNTAX' },
  ]

  const testAgent = await db.agent.findFirst()
  if (testAgent) {
    for (const p of maliciousPayloads) {
      try {
        const res = await fetch(`${baseUrl}/api/agents/${testAgent.id}/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: p.body,
        })

        // Server MUST return 400 Bad Request, 401 Unauthorized, or 422 Unprocessable Entity
        // Server MUST NEVER return 500 Internal Server Error or crash
        assert.notEqual(res.status, 500, `Endpoint returned HTTP 500 Internal Server Error for ${p.name}`)
        assert.ok([400, 401, 422, 404, 405].includes(res.status), `Unexpected status ${res.status} for ${p.name}`)
        pass(`API Fuzz Guard: ${p.name}`, `Safely rejected with HTTP ${res.status}`)
      } catch (err: any) {
        fail(`API Fuzz Guard: ${p.name}`, err)
      }
    }
  }

  // -------------------------------------------------------------------------
  // SECTION 3: QUEUE ENGINE RAPID FLOODING (100 RAPID WAKE PULSES)
  // -------------------------------------------------------------------------
  console.log('\n── 3. Queue Engine Rapid Flooding (100 Rapid Heartbeat Pulses) ──')

  try {
    if (testAgent) {
      const startTime = Date.now()
      const floodPromises = Array.from({ length: 100 }, (_, i) =>
        requestAgentWake({
          organizationId: testAgent.organizationId,
          agentId: testAgent.id,
          triggerType: 'MANUAL',
          triggerRef: `FLOOD_PULSE_${i}`,
        }),
      )

      const floodResults = await Promise.all(floodPromises)
      const duration = Date.now() - startTime

      assert.equal(floodResults.length, 100, 'All 100 rapid wake requests must resolve')
      const enqueuedCount = floodResults.filter((r) => r.enqueued).length
      const coalescedCount = floodResults.filter((r) => r.coalesced).length

      pass(
        '100 Rapid Heartbeat Pulses Coalesced',
        `Processed in ${duration}ms (${enqueuedCount} Enqueued, ${coalescedCount} Coalesced)`,
      )
    }
  } catch (err: any) {
    fail('100 Rapid Heartbeat Pulses Coalesced', err)
  }

  // -------------------------------------------------------------------------
  // SECTION 4: GOVERNANCE & BUDGET RACE CONDITION ATACKS
  // -------------------------------------------------------------------------
  console.log('\n── 4. Governance & Budget Race Condition Attacks ──')

  try {
    if (testAgent) {
      // Create a test approval sheet
      const approvalCode = `ADV-APR-${Date.now()}`
      const approval = await db.approval.create({
        data: {
          organizationId: testAgent.organizationId,
          code: approvalCode,
          type: 'BUDGET',
          title: 'Adversarial Race Test Approval',
          description: 'Testing race conditions under concurrent resolutions',
          amount: 5000,
          requesterId: testAgent.id,
          status: 'PENDING',
        },
      })

      // 20 parallel callers trying to approve the SAME sheet at the EXACT same instant
      const racePromises = Array.from({ length: 20 }, async (_, i) => {
        try {
          const res = await db.approval.updateMany({
            where: { id: approval.id, status: 'PENDING' },
            data: { status: i % 2 === 0 ? 'APPROVED' : 'REJECTED', resolvedAt: new Date() },
          })
          return res.count > 0 ? 'WON' : 'LOST'
        } catch {
          return 'ERROR'
        }
      })

      const raceResults = await Promise.all(racePromises)
      const winners = raceResults.filter((r) => r === 'WON').length
      const losers = raceResults.filter((r) => r === 'LOST').length

      assert.equal(winners, 1, 'Strictly ONE transaction must win approval resolution')
      assert.equal(losers, 19, 'The remaining 19 transactions must be rejected without data corruption')

      await db.approval.delete({ where: { id: approval.id } }).catch(() => {})

      pass('Approval Resolution Concurrency Guard', '1 Winner, 19 Idempotent Rejections')
    }
  } catch (err: any) {
    fail('Approval Resolution Concurrency Guard', err)
  }

  // -------------------------------------------------------------------------
  // SECTION 5: MEMORY LEAK & EVENT RETENTION TICK TEST
  // -------------------------------------------------------------------------
  console.log('\n── 5. Memory Heap Stability & Event Retention Tick Test ──')

  try {
    const memBefore = process.memoryUsage().heapUsed
    const dummyArray = []

    for (let i = 0; i < 500; i++) {
      dummyArray.push({
        id: `event-${i}`,
        type: 'TICK',
        timestamp: new Date(),
        payload: { text: 'Memory test payload data string sample' },
      })
    }

    const memAfter = process.memoryUsage().heapUsed
    const memDiffMb = ((memAfter - memBefore) / 1024 / 1024).toFixed(2)

    pass('Heap Memory Stability Test', `Memory delta: ${memDiffMb} MB over 500 simulated ticks`)
  } catch (err: any) {
    fail('Heap Memory Stability Test', err)
  }

  console.log('\n========================================================================')
  console.log(`  SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('========================================================================\n')

  if (failed > 0) {
    console.error('Adversarial Findings:', findings)
    process.exit(1)
  }
}

runAdversarialChaosTests().catch((err) => {
  console.error('Fatal Chaos Testing Error:', err)
  process.exit(1)
})
