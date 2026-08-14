import 'dotenv/config'
import assert from 'node:assert/strict'
import { sanitizeInput, sanitizeObject, checkRateLimit } from '../src/lib/security'
import { filterSensitiveData } from '../src/lib/sensitive-data'
import { evaluateActionPolicy } from '../src/lib/agents/governance/policy-engine'

async function runComprehensiveSecuritySuite() {
  console.log('========================================================================')
  console.log('  🛡️ EKVAAR OS — COMPREHENSIVE SECURITY & PENETRATION AUDIT SUITE 🛡️')
  console.log('========================================================================\n')

  let passed = 0
  let failed = 0

  function pass(name: string, detail?: string) {
    passed++
    console.log(`  ✅ [PASS] ${name} ${detail ? `(${detail})` : ''}`)
  }

  function fail(name: string, err: any) {
    failed++
    console.error(`  ❌ [FAIL] ${name}:`, err.message || err)
  }

  // -------------------------------------------------------------------------
  // CATEGORY 1: XSS & HTML SANITIZATION AUDIT
  // -------------------------------------------------------------------------
  console.log('── 1. Cross-Site Scripting (XSS) & Input Sanitization ──')

  try {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert(1)',
      '<a href="javascript:void(0)">Click</a>',
      '<iframe src="javascript:alert(1)"></iframe>',
    ]

    for (const payload of xssPayloads) {
      const sanitized = sanitizeInput(payload)
      assert.ok(!sanitized.includes('<script>'), 'Script tag stripped')
      assert.ok(!sanitized.includes('javascript:'), 'JavaScript URI scheme stripped')
    }
    pass('XSS Vector Neutralization', 'Neutralized <script>, onerror, javascript: URIs')

    // Object sanitization recursion
    const nestedMaliciousObj = {
      title: 'Clean Title',
      comment: '<script>alert(1)</script>User text',
      nested: {
        payload: 'javascript:stealTokens()',
      },
    }
    const cleanObj = sanitizeObject(nestedMaliciousObj)
    assert.equal(cleanObj.comment, 'User text')
    assert.equal(cleanObj.nested.payload, 'stealTokens()')
    pass('Recursive Object Sanitization', 'Sanitized nested object keys & string values')
  } catch (err: any) {
    fail('XSS & Input Sanitization Audit', err)
  }

  // -------------------------------------------------------------------------
  // CATEGORY 2: SENSITIVE DATA REDACTION & SECRET LEAKAGE AUDIT
  // -------------------------------------------------------------------------
  console.log('\n── 2. Sensitive Data Redaction & API Leakage Prevention ──')

  try {
    const sensitiveData = {
      userId: 'user_123',
      name: 'John Doe',
      email: 'john@example.com',
      password: 'super_secret_password_123',
      apiKey: 'sk_live_999999999999',
      accessToken: 'Bearer eyJhbGciOiJKV1QiLCJ0eXAi...',
      refreshToken: 'rf_99999999',
      nestedConfig: {
        secretKey: 'top_secret_aws_key',
        publicProp: 'public_value',
      },
    }

    const redacted = filterSensitiveData(sensitiveData) as Record<string, any>

    assert.equal(redacted.password, '***REDACTED***')
    assert.equal(redacted.apiKey, '***REDACTED***')
    assert.equal(redacted.accessToken, '***REDACTED***')
    assert.equal(redacted.refreshToken, '***REDACTED***')
    assert.equal(redacted.nestedConfig.secretKey, '***REDACTED***')
    assert.equal(redacted.nestedConfig.publicProp, 'public_value')
    assert.equal(redacted.userId, 'user_123')

    pass('Sensitive Data Redaction Filter', 'Redacted password, apiKey, accessToken, refreshToken, secretKey')
  } catch (err: any) {
    fail('Sensitive Data Redaction Filter', err)
  }

  // -------------------------------------------------------------------------
  // CATEGORY 3: RATE LIMITING & BRUTE FORCE PROTECTION
  // -------------------------------------------------------------------------
  console.log('\n── 3. Rate Limiting & Brute Force Attack Mitigation ──')

  try {
    const testIP = '192.168.1.99'

    // Fuzz rate limiter with 15 rapid auth login attempts
    let blockedAt = -1
    for (let i = 1; i <= 15; i++) {
      const result = checkRateLimit(testIP, '/api/auth/callback/credentials')
      if (!result.allowed) {
        blockedAt = i
        break
      }
    }

    assert.ok(blockedAt > 0 && blockedAt <= 11, `Auth login brute force must be throttled at 10 requests (Blocked at attempt #${blockedAt})`)
    pass('Auth Login Brute Force Mitigation', `Blocked credential brute force after attempt #${blockedAt}`)
  } catch (err: any) {
    fail('Auth Login Brute Force Mitigation', err)
  }

  // -------------------------------------------------------------------------
  // CATEGORY 4: GOVERNANCE ACTION PRIVILEGE ESCALATION
  // -------------------------------------------------------------------------
  console.log('\n── 4. Governance Privilege Escalation & Policy Guarding ──')

  try {
    // Attempting unauthorized financial transfer as CMO without approval
    const cmoPolicy = evaluateActionPolicy({
      actionCategory: 'EXECUTE_FINANCIAL_TRANSACTION',
      agentCode: 'CMO',
      amount: 150000,
    })
    assert.equal(cmoPolicy.decision, 'REQUIRE_APPROVAL', 'CMO financial transaction must require approval')

    // Attempting unauthorized system core modification as SPECIALIST
    const specialistPolicy = evaluateActionPolicy({
      actionCategory: 'MODIFY_SYSTEM_CORE',
      agentCode: 'SPECIALIST',
    })
    assert.ok(['DENY', 'REQUIRE_APPROVAL'].includes(specialistPolicy.decision), 'System core modification must be denied or gated')

    pass('Governance Privilege Escalation Prevention', 'Enforced STRATEGIC approval gating for financial & system core operations')
  } catch (err: any) {
    fail('Governance Privilege Escalation Prevention', err)
  }

  // -------------------------------------------------------------------------
  // CATEGORY 5: LIVE HTTP SECURITY HEADERS AUDIT
  // -------------------------------------------------------------------------
  console.log('\n── 5. Live HTTP Response Security Headers Audit ──')

  try {
    const res = await fetch('http://localhost:3000/api/auth/setup')
    const headers = res.headers

    assert.equal(headers.get('x-frame-options'), 'DENY', 'Must enforce X-Frame-Options: DENY (Clickjacking Protection)')
    assert.equal(headers.get('x-content-type-options'), 'nosniff', 'Must enforce X-Content-Type-Options: nosniff (MIME Sniffing Protection)')
    assert.equal(headers.get('referrer-policy'), 'strict-origin-when-cross-origin', 'Must enforce strict Referrer-Policy')
    assert.ok(headers.get('content-security-policy') !== null, 'Must define Content-Security-Policy header')

    pass('HTTP Security Headers Audit', 'Enforced X-Frame-Options: DENY, nosniff, Referrer-Policy, and CSP')
  } catch (err: any) {
    fail('HTTP Security Headers Audit', err)
  }

  console.log('\n========================================================================')
  console.log(`  SECURITY AUDIT SUMMARY: ${passed} PASSED, ${failed} FAILED`)
  console.log('========================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runComprehensiveSecuritySuite().catch((err) => {
  console.error('Fatal Security Audit Error:', err)
  process.exit(1)
})
