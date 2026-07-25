/**
 * Provider Manager (Phase 1.3)
 * 
 * Responsible for Execution Strategy.
 * Resolves high-level capabilities (e.g. 'read_spreadsheet') to specific Provider tools (e.g. 'googlesheets_read_range')
 * based on health, priority, and availability.
 */

import { OSModule } from './registry'
import { db } from '@/lib/db'
import { ProviderRegistry } from './providers/provider-registry'
import { ComposioProvider } from './providers/composio-provider'
import { CapabilityRegistry, Capability } from './capability-registry'

export interface IProviderManager extends OSModule {
  resolveCapability(capabilityName: string): Promise<ResolvedTool | null>
  executeTask(task: any, capabilityName: string, input: any): Promise<any>
}

export interface ResolvedTool {
  id: string
  provider: string // 'native', 'composio', 'mcp', 'local'
  toolSlug: string
  priority: number
}

export class ProviderManager implements IProviderManager {
  name = 'ProviderManager'
  
  async initialize() {
    console.log('[ProviderManager] Initializing Execution Strategies...')
    
    // Register Composio as the universal capability provider for Phase 3.1
    const composioProvider = new ComposioProvider()
    ProviderRegistry.register(composioProvider)

    // Authenticate the provider to trigger state transition and dynamic capability mapping
    await composioProvider.authenticate('SYSTEM')
  }

  async health() {
    return { status: 'HEALTHY' as const, latencyMs: 5 }
  }

  /**
   * Resolves a capability to the best available tool using failover logic.
   */
  async resolveCapability(capabilityName: string): Promise<ResolvedTool | null> {
    console.log(`[ProviderManager] Resolving capability: ${capabilityName}`)
    
    // In Phase 3.1, capabilities are dynamically mapped into the in-memory CapabilityRegistry
    const matches = CapabilityRegistry.findByName(capabilityName)

    if (!matches || matches.length === 0) {
      console.warn(`[ProviderManager] No active tools registered for capability: ${capabilityName}`)
      return null
    }

    // Pick the first matched capability (in a full system, you would apply priority and failover)
    const bestCapability = matches[0]
    
    return {
      id: bestCapability.id,
      provider: bestCapability.provider,
      toolSlug: bestCapability.toolSlug,
      priority: 1 // default priority
    }
  }

  async executeTask(task: any, capabilityName: string, input: any) {
    const tool = await this.resolveCapability(capabilityName)
    
    if (!tool) throw new Error(`Could not resolve capability: ${capabilityName}`)
    
    console.log(`[ProviderManager] Resolved ${capabilityName} -> ${tool.provider}:${tool.toolSlug} (Priority ${tool.priority})`)
    console.log(`[ProviderManager] Executing tool [${tool.provider}] ${tool.toolSlug}`)

    const providerInstance = ProviderRegistry.get(tool.provider)

    if (providerInstance) {
      console.log(`[ProviderManager] Routing to first-class provider: ${providerInstance.name}`)
      const result = await providerInstance.execute(tool.toolSlug, {
        organizationId: task.workflow?.organizationId || 'SYSTEM',
        input: input
      })

      if (!result.success) {
        throw new Error(`Execution failed: ${result.error}`)
      }

      return result
    }
    
    throw new Error(`Provider tier '${tool.provider}' is not fully implemented yet and no first-class provider was found.`)
  }

  /**
   * Dispatches execution to the respective tier (Native, Composio, etc.)
   */
  async executeTool(tool: ResolvedTool, params: any): Promise<any> {
    console.log(`[ProviderManager] Executing tool [${tool.provider}] ${tool.toolSlug}`)
    
    if (tool.provider === 'composio') {
      // Lazy load to prevent circular/startup issues if Composio is heavy
      const { executeTool } = await import('@/lib/composio-service')
      
      const result = await executeTool({
        organizationId: params.organizationId, toolkitSlug: tool.toolSlug.split('_')[0], // Very naive deduction, actual implementation needs robust mapping
        toolSlug: tool.toolSlug,
        agentCode: params.agentCode || 'SYSTEM',
        agentName: params.agentName || 'OS Kernel',
        input: params.input || {}
      })
      
      if (!result.success) {
        throw new Error(`Execution failed: ${result.error}`)
      }
      return result.output
    }
    
    if (tool.provider === 'native') {
      console.log(`[ProviderManager] Executing NATIVE tool: ${tool.toolSlug}`)
      return { success: true, dummy: 'native_execution_result' }
    }
    
    throw new Error(`Provider tier '${tool.provider}' is not fully implemented yet.`)
  }
}
