/**
 * EKVAAR OS — Platform Scale & Load Test Suite (Phase 7: v3.5.0-platform-ready)
 * Validates concurrent database queries, agent queue throughput, storage, and health benchmarks.
 */

import { db } from '../apps/frontend/src/lib/db'
import { agentQueue } from '../apps/frontend/src/lib/queue'
import { storeArtifact } from '../apps/frontend/src/lib/artifact-storage'
import { hybridSearchKnowledge } from '../apps/frontend/src/lib/knowledge-retrieval'

async function runPlatformLoadTest() {
  console.log(`====================================================`)
  console.log(`  EKVAAR OS — Platform Load & Scale Validation       `)
  console.log(`  Target Tag: v3.5.0-platform-ready                 `)
  console.log(`====================================================\n`)

  const start = Date.now()

  // 1. Concurrent Database Queries Test
  process.stdout.write(`[*] Test 1: Executing 50 concurrent Organization DB reads... `)
  const dbPromises = Array.from({ length: 50 }, () => db.organization.findFirst())
  await Promise.all(dbPromises)
  console.log(`✅ PASSED (${Date.now() - start}ms)`)

  // 2. Queue Throughput Test
  const queueStart = Date.now()
  process.stdout.write(`[*] Test 2: Enqueuing 100 concurrent Agent heartbeat jobs... `)
  const queuePromises = Array.from({ length: 100 }, (_, i) =>
    agentQueue.enqueueJob({
      jobId: `load_job_${i}`,
      organizationId: 'org_test_123',
      agentId: 'ag_cmo',
      agentRole: 'CMO',
      taskType: 'RESEARCH',
      mission: 'Competitor Launch Analysis',
      createdAt: new Date().toISOString(),
    })
  )
  await Promise.all(queuePromises)
  console.log(`✅ PASSED (${Date.now() - queueStart}ms)`)

  // 3. Artifact Storage Benchmark
  const storageStart = Date.now()
  process.stdout.write(`[*] Test 3: Storing 20 binary artifacts with SHA-256 checksums... `)
  const dummyBuffer = Buffer.from('EKVAAR_PLATFORM_SCALE_TEST_DATA_STREAM')
  const storagePromises = Array.from({ length: 20 }, (_, i) =>
    storeArtifact('test_org', `test_file_${i}.txt`, dummyBuffer, 'text/plain')
  )
  await Promise.all(storagePromises)
  console.log(`✅ PASSED (${Date.now() - storageStart}ms)`)

  // 4. Hybrid Knowledge Retrieval Performance
  const searchStart = Date.now()
  process.stdout.write(`[*] Test 4: Executing Hybrid pgvector + Full-text retrieval query... `)
  const results = await hybridSearchKnowledge({
    organizationId: 'org_test_123',
    query: 'EKVAAR Brand Identity & Autonomous C-Suite',
  })
  console.log(`✅ PASSED (${results.length} docs retrieved in ${Date.now() - searchStart}ms)`)

  const totalTimeMs = Date.now() - start

  console.log(`\n====================================================`)
  console.log(`  ✅ PLATFORM SCALE VALIDATION COMPLETE!`)
  console.log(`  Total Test Time: ${totalTimeMs}ms`)
  console.log(`  Platform Status: v3.5.0-platform-ready`)
  console.log(`====================================================\n`)
}

runPlatformLoadTest().catch((err) => {
  console.error(`[!] Load test failed:`, err)
  process.exit(1)
})
