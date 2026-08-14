// Testing Kernel Execution
const { Kernel } = require('./src/lib/os/kernel')
const { db } = require('./src/lib/db')

async function runTest() {
  console.log('--- Setting up Founder Acceptance Tests ---')
  let user = await db.user.findFirst()
  if (!user) {
    user = await db.user.create({ data: { 
      email: 'founder@ekvaar.com', 
      name: 'Founder'
    } })
  }

  const ensureCapability = async (capName: string, provider: string) => {
    let cap = await db.capability.findFirst({ where: { name: capName } })
    if (!cap) {
      let agent = await db.agent.findFirst()
      cap = await db.capability.create({
        data: {
          userId: user.id,
          name: capName,
          description: 'A mock capability for testing',
          ownerId: agent ? agent.id : 'SYSTEM',
          category: 'general'
        }
      })
    }
    const registry = await db.toolRegistry.findFirst({ where: { capabilityId: cap.id } })
    if (!registry) {
      await db.toolRegistry.create({
        data: { capabilityId: cap.id, provider, toolSlug: capName, priority: 1 }
      })
    }
  }

  // Provision capabilities for our Founder Tests
  await ensureCapability('googleslides_create_presentation', 'google_docs') // Map to docs for now, or new provider
  await ensureCapability('googlesheets_create_spreadsheet', 'google_sheets')
  await ensureCapability('github_create_pull_request', 'github')
  await ensureCapability('canva_create_design', 'canva')
  await ensureCapability('browser_research', 'browser')

  console.log('--- Executing Test 1: Board Meeting Deck ---')
  const result1 = await Kernel.execute({
    userId: user.id,
    intent: 'Create a board meeting deck.',
    payload: { title: 'Q3 Board Meeting', capability: 'googleslides_create_presentation' }
  })
  console.log('Result 1:', result1)

  // Give DAG time
  await new Promise(r => setTimeout(r, 2000))

  console.log('\n--- Validating Telemetry & Events ---')
  const events = await db.systemEvent.findMany({ orderBy: { timestamp: 'desc' }, take: 10 })
  console.log('Recent Events:', events.map((e: any) => `[${e.source}] ${e.type}`).join(', '))
  
  const metrics = await db.telemetryMetric.findMany({ orderBy: { timestamp: 'desc' }, take: 5 })
  console.log('Recent Metrics:', metrics.map((m: any) => `${m.metric}: ${m.value} ${m.unit}`).join(', '))
}

runTest().catch(console.error).finally(() => process.exit())
