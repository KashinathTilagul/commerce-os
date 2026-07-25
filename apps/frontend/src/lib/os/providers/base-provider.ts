/**
 * Provider Simulator Framework (Phase 1.5)
 * 
 * Defines the contract for all providers (Production and Simulation).
 */

export interface ProviderResponse {
  success: boolean
  output?: any
  error?: string
  workspaceId?: string // If the tool creates/modifies a workspace
  artifactExportUrl?: string
}

export type ProviderState = 
  | 'DISCONNECTED'
  | 'AUTHENTICATING'
  | 'CONNECTED'
  | 'SYNCING'
  | 'READY'
  | 'RATE_LIMITED'
  | 'ERROR'
  | 'DISABLED'

export interface IProvider {
  name: string
  toolkitSlug: string
  state: ProviderState

  /**
   * Health check to determine if provider is accessible/configured.
   */
  health(): Promise<{ status: 'HEALTHY' | 'UNHEALTHY' | 'DEGRADED'; reason?: string }>

  /**
   * Authenticate / verify permissions.
   */
  authenticate(userId: string): Promise<boolean>

  /**
   * Execute the tool.
   */
  execute(
    toolSlug: string,
    params: { organizationId: string; input: any; agentCode?: string; agentName?: string }
  ): Promise<ProviderResponse>
}
