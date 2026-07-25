/**
 * OS Kernel
 * 
 * The heart of the EKVAAR OS. Every request enters here before reaching any other service.
 * The Kernel orchestrates the Request Router, Permissions, Context, and Workflow Launcher.
 */

import { ServiceRegistry, IEventDispatcher } from './registry'
import { ProviderManager } from './provider-manager'
import { WorkflowEngine, IWorkflowEngine } from './workflow-engine'
import { EventBus } from './event-bus'
import { WorkspaceManager, IWorkspaceManager } from './workspace-manager'
import { MemoryEngine } from './memory-engine'
import { TelemetryEngine } from './telemetry-engine'
import { WorkspaceSyncEngine } from './workspace-sync'
import { CredentialManager } from './credential-manager'

// 1. Interfaces for Kernel Subsystems

export interface IRequestRouter {
  route(input: { organizationId: string; intent: string; payload: any }): Promise<KernelResponse>
}

export interface IContextManager {
  injectContext(organizationId: string, intent: string): Promise<any>
}

export interface IPermissionManager {
  validate(organizationId: string, action: string): Promise<boolean>
}

export interface KernelResponse {
  success: boolean
  workflowId?: string
  error?: string
  message: string
}

// 2. The Core OS Kernel

class OSKernel {
  private isBooted = false
  
  async boot() {
    if (this.isBooted) return
    console.log('[Kernel] Booting OS V2...')

    // Register core services
    ServiceRegistry.register(new EventBus())
    ServiceRegistry.register(new CredentialManager())
    ServiceRegistry.register(new ProviderManager())
    ServiceRegistry.register(new WorkflowEngine())
    ServiceRegistry.register(new WorkspaceManager())
    ServiceRegistry.register(new MemoryEngine())
    ServiceRegistry.register(new TelemetryEngine())
    ServiceRegistry.register(new WorkspaceSyncEngine())

    // Initialize all registered services
    await ServiceRegistry.initializeAll()

    this.isBooted = true
    console.log('[Kernel] Boot complete. System is ready.')
  }

  /**
   * The single entry point for all execution in EKVAAR OS V2.
   */
  async execute(request: { organizationId: string; intent: string; payload: any }): Promise<KernelResponse> {
    if (!this.isBooted) await this.boot()
    
    console.log(`[Kernel] Received execution request for user ${request.organizationId}: ${request.intent}`)

    // 1. Dispatch Event
    const eventBus = ServiceRegistry.get<IEventDispatcher>('EventBus')
    await eventBus.publish({
      type: 'KERNEL_REQUEST_RECEIVED',
      source: 'OS_KERNEL',
      payload: { intent: request.intent }
    })

    // 2. Mock Natural Language -> DAG compilation
    // In Phase 2/3 this is a dedicated Agent or Planner. For Phase 1, we hardcode the slice.
    console.log('[Kernel] Compiling intent into Workflow DAG...')
    const workflowEngine = ServiceRegistry.get<IWorkflowEngine>('WorkflowEngine')
    
    const workflowId = await workflowEngine.submitWorkflow(
      request.organizationId,
      request.intent || 'Unnamed Task',
      {
        nodes: [
          {
            id: 'task_1',
            capability: request.payload?.capability || 'read_context',
            inputParams: { ...request.payload },
            dependencies: []
          }
        ]
      }
    )

    return {
      success: true,
      workflowId,
      message: 'Request dispatched to Workflow Engine successfully.',
    }
  }
}

export const Kernel = new OSKernel()
