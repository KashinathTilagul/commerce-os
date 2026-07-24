/**
 * Telemetry Engine (Phase 1.5)
 * 
 * Tracks system metrics (duration, latency, usage) from events.
 */

import { OSModule, ServiceRegistry, IEventDispatcher } from './registry'
import { db } from '@/lib/db'

export class TelemetryEngine implements OSModule {
  name = 'TelemetryEngine'

  async initialize() {
    console.log('[TelemetryEngine] Initializing Execution Metrics Tracker...')
    const eventBus = ServiceRegistry.get<IEventDispatcher>('EventBus')
    
    if ('subscribe' in eventBus) {
      const bus = eventBus as any
      bus.subscribe('WORKFLOW_STARTED', this.onWorkflowStarted.bind(this))
      bus.subscribe('WORKFLOW_COMPLETED', this.onWorkflowCompleted.bind(this))
      bus.subscribe('WORKFLOW_FAILED', this.onWorkflowFailed.bind(this))
      bus.subscribe('TASK_COMPLETED', this.onTaskCompleted.bind(this))
      bus.subscribe('TASK_FAILED', this.onTaskFailed.bind(this))
    }
  }

  async health() {
    return { status: 'HEALTHY' as const, latencyMs: 2 }
  }

  private async onWorkflowStarted(event: any) {
    await this.recordMetric('workflow_count', 1, 'count', 'WORKFLOW_ENGINE', { workflowId: event.payload.workflowId })
  }

  private async onWorkflowCompleted(event: any) {
    const { workflowId, durationMs } = event.payload
    await this.recordMetric('workflow_duration', durationMs || 0, 'ms', 'WORKFLOW_ENGINE', { workflowId })
    await this.recordMetric('workflow_success', 1, 'count', 'WORKFLOW_ENGINE', { workflowId })
  }

  private async onWorkflowFailed(event: any) {
    const { workflowId, error } = event.payload
    await this.recordMetric('workflow_failure', 1, 'count', 'WORKFLOW_ENGINE', { workflowId, error })
  }

  private async onTaskCompleted(event: any) {
    const { taskId, workflowId, durationMs, provider, toolSlug, cost } = event.payload
    await this.recordMetric('task_duration', durationMs || 0, 'ms', 'PROVIDER_MANAGER', { taskId, workflowId })
    if (provider) {
      await this.recordMetric('provider_success', 1, 'count', 'PROVIDER_MANAGER', { provider, toolSlug })
    }
    if (cost) {
      await this.recordMetric('execution_cost', cost, 'usd', 'PROVIDER_MANAGER', { taskId })
    }
  }

  private async onTaskFailed(event: any) {
    const { taskId, workflowId, provider, toolSlug, error } = event.payload
    if (provider) {
      await this.recordMetric('provider_failure', 1, 'count', 'PROVIDER_MANAGER', { provider, toolSlug, error })
    }
  }

  private async recordMetric(metric: string, value: number, unit: string, source: string, tagsObj?: any) {
    try {
      await db.telemetryMetric.create({
        data: {
          metric,
          value,
          unit,
          source,
          tags: tagsObj ? JSON.stringify(tagsObj) : null,
          workflowId: tagsObj?.workflowId,
          taskId: tagsObj?.taskId,
        }
      })
    } catch (error) {
      console.error(`[TelemetryEngine] Error recording metric ${metric}:`, error)
    }
  }
}
