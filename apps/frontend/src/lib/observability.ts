/**
 * EKVAAR OS — Distributed Observability & Trace Context (Phase 2)
 */

import { crypto } from '@/lib/crypto'

export interface TraceContext {
  traceId: string
  organizationId?: string
  userId?: string
  agentId?: string
  workItemId?: string
  eventId?: string
  executionId?: string
}

export function createTraceContext(params: Partial<TraceContext> = {}): TraceContext {
  return {
    traceId: params.traceId || `trc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    organizationId: params.organizationId,
    userId: params.userId,
    agentId: params.agentId,
    workItemId: params.workItemId,
    eventId: params.eventId,
    executionId: params.executionId || `exec_${Date.now().toString(36)}`,
  }
}

export function logStructured(level: 'info' | 'warn' | 'error', message: string, ctx: TraceContext, extra: Record<string, any> = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    context: ctx,
    ...extra,
  }
  console.log(JSON.stringify(payload))
  return payload
}
