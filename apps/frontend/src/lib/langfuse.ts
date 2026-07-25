import { db } from '@/lib/db'

export async function startTrace(organizationId: string, options: { name: string; agentCode?: string; metadata?: any }) {
  const traceId = `trace_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  
  let actorId: string | undefined = undefined
  let actorName = 'System'
  
  if (options.agentCode) {
    const agent = await db.agent.findFirst({ where: { organizationId, code: options.agentCode } })
    if (agent) {
      actorId = agent.id
      actorName = agent.name
    }
  }

  await db.event.create({
    data: {
      organizationId,
      type: 'LLM_TRACE',
      actorId,
      actorName,
      summary: `Trace started: ${options.name}`,
      payload: JSON.stringify({ traceId, status: 'STARTED', ...options }),
    }
  })
  
  return traceId
}

export async function startSpan(traceId: string, options: { name: string; input?: any; metadata?: any }) {
  const spanId = `span_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  
  const traceEvent = await db.event.findFirst({ 
    where: { type: 'LLM_TRACE', payload: { contains: traceId } },
    orderBy: { timestamp: 'desc' }
  })
  
  if (!traceEvent) return spanId

  await db.event.create({
    data: {
      organizationId: traceEvent.organizationId,
      type: 'LLM_SPAN',
      actorId: traceEvent.actorId,
      actorName: traceEvent.actorName,
      summary: `Span started: ${options.name}`,
      payload: JSON.stringify({ traceId, spanId, status: 'STARTED', ...options }),
    }
  })

  return spanId
}

export async function endSpan(spanId: string, options: { output?: any; statusCode?: string; tokenUsage?: { input: number; output: number; total: number }; latencyMs?: number; cost?: number }) {
  const spanEvent = await db.event.findFirst({ 
    where: { type: 'LLM_SPAN', payload: { contains: spanId } },
    orderBy: { timestamp: 'desc' }
  })
  
  if (!spanEvent) return

  await db.event.create({
    data: {
      organizationId: spanEvent.organizationId,
      type: 'LLM_SPAN',
      actorId: spanEvent.actorId,
      actorName: spanEvent.actorName,
      summary: `Span ended`,
      payload: JSON.stringify({ spanId, status: 'ENDED', ...options }),
    }
  })
}

export async function endTrace(traceId: string) {
  const traceEvent = await db.event.findFirst({ 
    where: { type: 'LLM_TRACE', payload: { contains: traceId } },
    orderBy: { timestamp: 'desc' }
  })
  
  if (!traceEvent) return

  await db.event.create({
    data: {
      organizationId: traceEvent.organizationId,
      type: 'LLM_TRACE',
      actorId: traceEvent.actorId,
      actorName: traceEvent.actorName,
      summary: `Trace ended`,
      payload: JSON.stringify({ traceId, status: 'ENDED' }),
    }
  })
}

export async function getTraces(organizationId: string, options?: { agentCode?: string; limit?: number }) {
  const limit = options?.limit || 50
  const whereClause: any = { organizationId, type: 'LLM_TRACE' }
  
  if (options?.agentCode) {
    const agent = await db.agent.findFirst({ where: { organizationId, code: options.agentCode } })
    if (agent) {
      whereClause.actorId = agent.id
    } else {
      return [] // Agent not found
    }
  }

  const events = await db.event.findMany({
    where: whereClause,
    orderBy: { timestamp: 'desc' },
    take: limit
  })
  
  return events.map(e => ({
    id: e.id,
    actorName: e.actorName,
    timestamp: e.timestamp,
    summary: e.summary,
    payload: JSON.parse(e.payload)
  }))
}
