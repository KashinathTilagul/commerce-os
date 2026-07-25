import { IProvider, ProviderResponse, ProviderState } from './base-provider'
import { executeTool } from '@/lib/composio-service'
import { ServiceRegistry, IEventDispatcher } from '../registry'
import { CapabilityRegistry, Capability } from '../capability-registry'

export class ComposioProvider implements IProvider {
  name = 'Composio'
  toolkitSlug = 'composio'
  state: ProviderState = 'DISCONNECTED'

  private isSimulationMode = false
  private loadedApps: string[] = []

  constructor() {
    const apiKey = process.env.COMPOSIO_API_KEY
    if (!apiKey || apiKey.includes('replace_with_real')) {
      this.isSimulationMode = true
      console.log(`[ComposioProvider] Starting in SIMULATION mode`)
    } else {
      console.log(`[ComposioProvider] Starting in PRODUCTION mode`)
    }
  }

  async health() {
    return { status: 'HEALTHY' as const }
  }

  async authenticate(organizationId: string) {
    this.state = 'AUTHENTICATING'
    
    // In a real flow, this would call Composio SDK or credential manager to verify connection
    // For now we simulate success and map capabilities
    await this.mapCapabilities()
    
    this.state = 'READY'
    return true
  }

  private async mapCapabilities() {
    console.log('[ComposioProvider] Dynamically querying and mapping capabilities...')
    
    // In production, you would use `composioClient.apps.list()` or `composioClient.actions.list()`
    // Here we seed some capabilities for demonstration as per Phase 3.1
    const dynamicCapabilities: Capability[] = [
      { id: 'google_docs_create', name: 'Create Google Doc', description: 'Creates a Google Doc', provider: 'composio', toolSlug: 'GOOGLE_DOCS_CREATE_DOCUMENT' },
      { id: 'google_docs_read', name: 'Read Google Doc', description: 'Reads a Google Doc', provider: 'composio', toolSlug: 'GOOGLE_DOCS_READ_DOCUMENT' },
      { id: 'google_sheets_create', name: 'Create Google Sheet', description: 'Creates a Google Sheet', provider: 'composio', toolSlug: 'GOOGLE_SHEETS_CREATE_SPREADSHEET' },
      { id: 'github_create_issue', name: 'Create GitHub Issue', description: 'Creates a GitHub issue', provider: 'composio', toolSlug: 'GITHUB_CREATE_ISSUE' }
    ]

    CapabilityRegistry.registerMany(dynamicCapabilities)
  }

  async execute(
    toolSlug: string,
    params: { organizationId: string; input: any; agentCode?: string; agentName?: string }
  ): Promise<ProviderResponse> {
    
    const executeParams = {
      organizationId: params.organizationId, toolkitSlug: 'composio',
      toolSlug: toolSlug,
      agentCode: params.agentCode || 'UNKNOWN',
      agentName: params.agentName || 'System',
      input: params.input
    }

    if (this.isSimulationMode) {
      // Execute via the existing composio-service mock execution
      return await executeTool(executeParams)
    }

    try {
      console.log(`[ComposioProvider] EXECUTING REAL TOOL: ${toolSlug}`)
      
      // Simulate real execution success for now
      const result = await executeTool(executeParams)

      // Emit event for Workspace Binding (Step 4 of Phase 3.1)
      const eventBus = ServiceRegistry.get<IEventDispatcher>('EventBus')
      if (eventBus) {
        await eventBus.publish({
          type: 'TASK_COMPLETED',
          source: 'ComposioProvider',
          payload: {
            workspaceId: `ws_composio_${Date.now()}`,
            provider: 'composio',
            action: toolSlug,
            status: 'SUCCESS'
          }
        })
      }

      return result

    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}
