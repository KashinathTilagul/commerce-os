/**
 * Memory Engine (Phase 1.7)
 * 
 * Subscribes to events and feeds memory/knowledge graph.
 */

import { OSModule, ServiceRegistry, IEventDispatcher } from './registry'

export class MemoryEngine implements OSModule {
  name = 'MemoryEngine'

  async initialize() {
    console.log('[MemoryEngine] Initializing Vector Memory subscriptions...')
    const eventBus = ServiceRegistry.get<IEventDispatcher>('EventBus')
    
    // Subscribe to Workflow completions to index results
    if ('subscribe' in eventBus) {
      (eventBus as any).subscribe('WORKFLOW_COMPLETED', this.onWorkflowCompleted.bind(this))
    }
  }

  async health() {
    return { status: 'HEALTHY' as const, latencyMs: 4 }
  }

  private async onWorkflowCompleted(event: any) {
    const { workflowId } = event.payload
    console.log(`[MemoryEngine] Indexing completed workflow: ${workflowId}`)
    // Future: Extract Artifacts/Workspace content and embed into Knowledge Graph
  }
}
