/**
 * EKVAAR OS — Production Smoke Test Suite (v3.3.1-release-stability)
 * 
 * Verifies core application endpoints & services:
 * 1. Health Check (/api/health)
 * 2. Database Access (/api/health/database)
 * 3. Kernel Sidecar (/api/health/kernel)
 * 4. Storage (/api/health/storage)
 * 5. Organization Loading (/api/organization)
 * 6. Digital Employees Roster (/api/agents)
 * 7. Workboard Issues (/api/issues)
 * 8. Executive Brief (/api/briefing)
 * 9. Founder Inbox (/api/founder-notes)
 * 10. Desktop Boot Settings (/api/settings)
 */

import http from 'http'
import https from 'https'

const TARGET_URL = process.env.SMOKE_TEST_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

interface TestResult {
  endpoint: string
  name: string
  passed: boolean
  status?: number
  error?: string
}

async function checkHttpEndpoint(path: string, name: string): Promise<TestResult> {
  const url = `${TARGET_URL}${path}`
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http
    const req = client.get(url, { timeout: 3000 }, (res) => {
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => {
        const passed = res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 400
        resolve({
          endpoint: path,
          name,
          passed,
          status: res.statusCode,
          error: passed ? undefined : `Status ${res.statusCode}: ${data.slice(0, 100)}`,
        })
      })
    })

    req.on('error', (err) => {
      resolve({
        endpoint: path,
        name,
        passed: false,
        error: err.message,
      })
    })

    req.on('timeout', () => {
      req.destroy()
      resolve({
        endpoint: path,
        name,
        passed: false,
        error: 'Timeout',
      })
    })
  })
}

async function runDirectRouteChecks(): Promise<TestResult[]> {
  const results: TestResult[] = []

  // Test 1: Database Health Handler
  try {
    const { GET: dbGet } = await import('../apps/frontend/src/app/api/health/database/route')
    const res = await dbGet()
    const data = await res.json()
    results.push({
      endpoint: '/api/health/database',
      name: '2. Database Access (Direct)',
      passed: res.status === 200 && data.status === 'healthy',
      status: res.status,
      error: res.status !== 200 ? data.error : undefined,
    })
  } catch (err: any) {
    results.push({
      endpoint: '/api/health/database',
      name: '2. Database Access (Direct)',
      passed: false,
      error: err.message,
    })
  }

  // Test 2: Storage Health Handler
  try {
    const { GET: storageGet } = await import('../apps/frontend/src/app/api/health/storage/route')
    const res = await storageGet()
    const data = await res.json()
    results.push({
      endpoint: '/api/health/storage',
      name: '4. Storage Read/Write (Direct)',
      passed: res.status === 200 && data.status === 'healthy',
      status: res.status,
      error: res.status !== 200 ? data.error : undefined,
    })
  } catch (err: any) {
    results.push({
      endpoint: '/api/health/storage',
      name: '4. Storage Read/Write (Direct)',
      passed: false,
      error: err.message,
    })
  }

  // Test 3: Main System Health Handler
  try {
    const { GET: mainGet } = await import('../apps/frontend/src/app/api/health/route')
    const res = await mainGet()
    const data = await res.json()
    results.push({
      endpoint: '/api/health',
      name: '1. System Health Check (Direct)',
      passed: res.status === 200,
      status: res.status,
      error: res.status !== 200 ? JSON.stringify(data.services) : undefined,
    })
  } catch (err: any) {
    results.push({
      endpoint: '/api/health',
      name: '1. System Health Check (Direct)',
      passed: false,
      error: err.message,
    })
  }

  return results
}

async function runSmokeTests() {
  console.log(`====================================================`)
  console.log(`  EKVAAR OS — Production Smoke Test (v3.3.1)        `)
  console.log(`====================================================\n`)

  // Check if server is running on target URL
  const ping = await checkHttpEndpoint('/api/health', 'Ping')

  if (ping.passed) {
    console.log(`[*] Live server detected at ${TARGET_URL}. Running HTTP suite...\n`)
    const tests = [
      { path: '/api/health', name: '1. System Health Check' },
      { path: '/api/health/database', name: '2. Database Access' },
      { path: '/api/health/kernel', name: '3. FastAPI Kernel Connection' },
      { path: '/api/health/storage', name: '4. Storage Read/Write' },
      { path: '/api/organization', name: '5. Organization Loading' },
      { path: '/api/agents', name: '6. Digital Employees Roster' },
      { path: '/api/issues', name: '7. Workboard Issues' },
      { path: '/api/briefing', name: '8. Executive Brief' },
      { path: '/api/founder-notes', name: '9. Founder Inbox' },
      { path: '/api/settings', name: '10. Desktop Boot Settings' },
    ]

    let passedCount = 0
    for (const test of tests) {
      process.stdout.write(`[*] Checking ${test.name}... `)
      const res = await checkHttpEndpoint(test.path, test.name)
      if (res.passed) {
        passedCount++
        console.log(`✅ PASSED (${res.status})`)
      } else {
        console.log(`❌ FAILED (${res.error})`)
      }
    }

    console.log(`\n====================================================`)
    console.log(`Smoke Test Summary: ${passedCount}/${tests.length} passed`)
    console.log(`====================================================`)
    process.exit(passedCount === tests.length ? 0 : 1)
  } else {
    console.log(`[*] No live HTTP server at ${TARGET_URL}. Running direct module health checks...\n`)
    const results = await runDirectRouteChecks()
    let passedCount = 0

    for (const res of results) {
      if (res.passed) {
        passedCount++
        console.log(`[*] ${res.name}: ✅ PASSED`)
      } else {
        console.log(`[*] ${res.name}: ❌ FAILED (${res.error})`)
      }
    }

    console.log(`\n====================================================`)
    console.log(`Direct Module Health Summary: ${passedCount}/${results.length} passed`)
    console.log(`====================================================`)
    process.exit(passedCount === results.length ? 0 : 1)
  }
}

runSmokeTests()
