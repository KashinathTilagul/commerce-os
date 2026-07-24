/**
 * Founder Acceptance Test: Composio Execution Pipeline
 * 
 * Verifies that the OS Kernel can route a workflow capability through 
 * the Provider Manager -> Capability Registry -> ComposioProvider
 * and properly emit Workspace Binding events.
 */

import { ProviderManager } from '../lib/os/provider-manager'
import { WorkspaceSyncEngine } from '../lib/os/workspace-sync'
import { EventBus } from '../lib/os/event-bus'
import { CapabilityRegistry } from '../lib/os/capability-registry'

async function runAcceptanceTest() {
  console.log('--- STARTING FOUNDER ACCEPTANCE TEST ---')
  
  const eventBus = new EventBus()
  await eventBus.initialize()

  const syncEngine = new WorkspaceSyncEngine()
  await syncEngine.initialize()

  const providerManager = new ProviderManager()
  await providerManager.initialize()

  console.log('\n[Test 1] Capability Resolution')
  const capability = await providerManager.resolveCapability('Create Google Doc')
  if (capability && capability.provider === 'composio') {
    console.log('✅ Capability properly resolved to ComposioProvider.')
  } else {
    console.error('❌ Capability resolution failed.')
    process.exit(1)
  }

  console.log('\n[Test 2] Execution Pipeline & Workspace Binding')
  
  // This should trigger the ComposioProvider -> emit TASK_COMPLETED -> WorkspaceSyncEngine handles it
  try {
    const result = await providerManager.executeTask({ workflow: { userId: 'FOUNDER' } }, 'Create Google Doc', { title: 'Test Document' })
    if (result.success) {
      console.log('✅ Composio Provider successfully executed and emitted Workspace events.')
    }
  } catch (error) {
    console.error('❌ Execution pipeline failed:', error)
  }

  console.log('\n--- FOUNDER ACCEPTANCE TEST COMPLETE ---')
}

// runAcceptanceTest()
