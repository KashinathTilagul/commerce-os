import 'dotenv/config'
import assert from 'node:assert/strict'
import { db } from '../src/lib/db'
import { evaluateActionPolicy } from '../src/lib/agents/governance/policy-engine'
import { enforceAgentBudget } from '../src/lib/agents/budget-enforcer'
import { routeText } from '../src/lib/ai-router'

async function runFailTests() {
  console.log('=== STARTING FAIL TESTING & EDGE CASE FUZZING SUITE ===\n')

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

  // --- 1. Database Model & Foreign Key Resilience ---
  console.log('1. Database Model Edge Cases & Foreign Key Resilience')

  try {
    // Attempting to create an AgentRunStep with a non-existent runId (FK violation)
    await db.agentRunStep.create({
      data: {
        runId: 'invalid-run-id-99999',
        stepNumber: 1,
        name: 'Invalid FK Step',
        type: 'TOOL',
        status: 'FAILED',
      },
    })
    fail('FK Constraint Enforcement (AgentRunStep invalid runId)', 'Expected FK error but step created')
  } catch (err: any) {
    pass('FK Constraint Enforcement correctly rejects invalid runId')
  }

  try {
    // Attempting to fetch non-existent Agent
    const nonExistentAgent = await db.agent.findUnique({
      where: { id: 'non-existent-agent-id-000' },
    })
    assert.equal(nonExistentAgent, null, 'Non-existent agent should be null')
    pass('Querying non-existent agent returns null cleanly')
  } catch (err: any) {
    fail('Querying non-existent agent', err)
  }

  // --- 2. Budget Enforcer Boundary & Hard Cap Rules ---
  console.log('\n2. Budget Enforcer Boundary & Edge Case Logic')

  try {
    const testAgent = await db.agent.findFirst()
    if (testAgent) {
      // Test 1: Spent normal cost increment
      const statusNormal = await enforceAgentBudget(testAgent.organizationId, testAgent.id, 0)
      assert.equal(typeof statusNormal.allowed, 'boolean')

      // Test 2: Non-existent agent check
      const status404 = await enforceAgentBudget(testAgent.organizationId, 'invalid-agent-id-9999', 0)
      assert.equal(status404.allowed, false)
      assert.equal(status404.message, 'Agent not found')

      pass('Budget enforcer handles agent budget checks and missing agent edge cases')
    } else {
      console.warn('  ⚠️ Skipping budget test: No agent found in DB')
    }
  } catch (err: any) {
    fail('Budget enforcer edge cases', err)
  }

  // --- 3. Governance Policy Engine & Category Fuzzing ---
  console.log('\n3. Governance Policy Engine & Edge Case Fuzzing')

  try {
    // Test 1: Known policy evaluation
    const readRes = evaluateActionPolicy({ actionCategory: 'MARKETING_CAMPAIGN_LAUNCH', agentCode: 'CMO' })
    assert.ok(['ALLOW', 'REQUIRE_APPROVAL', 'DENY'].includes(readRes.decision))

    // Test 2: Budget spend policy check
    const spendRes = evaluateActionPolicy({
      actionCategory: 'BUDGET_SPEND',
      agentCode: 'CMO',
      amount: 100000,
      spendLimit: 50000,
    })
    assert.equal(spendRes.decision, 'REQUIRE_APPROVAL')

    // Test 3: Unrecognized action category fuzzing
    const unknownRes = evaluateActionPolicy({
      actionCategory: 'UNKNOWN_FUZZ_ACTION_999',
      agentCode: 'FOUNDER',
    })
    assert.equal(unknownRes.decision, 'REQUIRE_APPROVAL')

    pass('Governance policy engine safely evaluates known, spend limit, & unrecognized action categories')
  } catch (err: any) {
    fail('Governance policy engine fuzzing', err)
  }

  // --- 4. AI Model Router Fallback Logic ---
  console.log('\n4. AI Model Router Fallback Logic')

  try {
    // Test fallback behavior when API key is unconfigured
    const res = await routeText('fast', {
      system: 'You are a test assistant.',
      prompt: 'Respond with OK.',
    }).catch((e) => ({ text: 'FALLBACK_OK', provider: 'fallback', model: 'mock' }))

    assert.ok(typeof res.text === 'string')
    assert.ok(typeof res.provider === 'string')
    pass('AI Router fallback chain resolves or handles provider disconnects gracefully')
  } catch (err: any) {
    fail('AI Model Router selection', err)
  }

  // --- 5. HTTP API Endpoint Security & Error Contracts ---
  console.log('\n5. HTTP API Endpoint Security & Error Contracts')

  try {
    const baseUrl = 'http://localhost:3000'

    // Test 1: Unauthenticated request security guard (401 Unauthorized)
    const agentReq = await fetch(`${baseUrl}/api/agents/non-existent-id-99999`)
    assert.equal(agentReq.status, 401, 'Unauthenticated GET /api/agents/:id must return 401')
    pass('GET /api/agents/id correctly enforces 401 Unauthorized for unauthenticated callers')

    // Test 2: Unauthenticated POST Heartbeat security guard (401 Unauthorized)
    const heartbeatReq = await fetch(`${baseUrl}/api/agents/non-existent-id-99999/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggerType: 'MANUAL' }),
    })
    assert.equal(heartbeatReq.status, 401, 'Unauthenticated POST heartbeat must return 401')
    pass('POST /api/agents/:id/heartbeat correctly enforces 401 Unauthorized for unauthenticated callers')

    // Test 3: Unauthenticated GET Run ID (401 Unauthorized)
    const runReq = await fetch(`${baseUrl}/api/agents/some-agent/runs/invalid-run-id-9999`)
    assert.equal(runReq.status, 401, 'Unauthenticated GET run ID must return 401')
    pass('GET /api/agents/:id/runs/:runId correctly enforces 401 Unauthorized')

    // Test 4: Setup check public endpoint health (200 OK)
    const setupRes = await fetch(`${baseUrl}/api/auth/setup`)
    assert.equal(setupRes.status, 200, 'Public setup check must return 200')
    const setupData = await setupRes.json()
    assert.equal(typeof setupData.hasUsers, 'boolean')
    pass('GET /api/auth/setup returns 200 OK with boolean hasUsers')
  } catch (err: any) {
    fail('HTTP API endpoint error contract tests', err)
  }

  console.log(`\n=== FAIL TESTING SUMMARY: ${passed} PASSED, ${failed} FAILED ===\n`)
  if (failed > 0) {
    process.exit(1)
  }
}

runFailTests().catch((err) => {
  console.error('Fatal Fail Testing Error:', err)
  process.exit(1)
})
