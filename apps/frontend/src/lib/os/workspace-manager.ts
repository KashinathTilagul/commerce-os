/**
 * Workspace Manager (Phase 1.6)
 * 
 * Manages live environments instead of static files.
 */

import { OSModule, ServiceRegistry, IEventDispatcher } from './registry'
import { db } from '@/lib/db'

export interface IWorkspaceManager extends OSModule {
  createWorkspace(organizationId: string, title: string): Promise<string>
  trackRevision(workspaceId: string, authorId: string, commitMsg: string, diffPayload?: any): Promise<void>
  connectProvider(workspaceId: string, provider: string, resourceUrl: string): Promise<void>
  exportArtifact(workspaceId: string, type: string): Promise<string>
}

export class WorkspaceManager implements IWorkspaceManager {
  name = 'WorkspaceManager'

  async initialize() {
    console.log('[WorkspaceManager] Initializing Execution Environments...')
  }

  async health() {
    return { status: 'HEALTHY' as const, latencyMs: 3 }
  }

  async createWorkspace(organizationId: string, title: string): Promise<string> {
    console.log(`[WorkspaceManager] Creating workspace: ${title}`)
    const ws = await db.workspace.create({
      data: {
        organizationId,
        title,
        status: 'DRAFT'
      }
    })

    const eventBus = ServiceRegistry.get<IEventDispatcher>('EventBus')
    await eventBus.publish({
      type: 'WORKSPACE_CREATED',
      source: 'WORKSPACE_MANAGER',
      payload: { workspaceId: ws.id, title }
    })

    return ws.id
  }

  async trackRevision(workspaceId: string, authorId: string, commitMsg: string, diffPayload?: any): Promise<void> {
    console.log(`[WorkspaceManager] Tracking revision for ${workspaceId}: ${commitMsg}`)
    await db.workspaceRevision.create({
      data: {
        workspaceId,
        authorId,
        commitMsg,
        diffPayload: diffPayload ? JSON.stringify(diffPayload) : null
      }
    })
  }

  async connectProvider(workspaceId: string, provider: string, resourceUrl: string): Promise<void> {
    console.log(`[WorkspaceManager] Connecting ${provider} to ${workspaceId}`)
    await db.workspaceConnection.create({
      data: {
        workspaceId,
        provider,
        resourceType: 'live_document',
        url: resourceUrl
      }
    })
  }

  async exportArtifact(workspaceId: string, type: string): Promise<string> {
    console.log(`[WorkspaceManager] Exporting ${type} from ${workspaceId}`)
    // Dummy return for Phase 1.6
    return 'exported-url-path'
  }
}
