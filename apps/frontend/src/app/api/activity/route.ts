export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'
import { filterSensitiveData } from '@/lib/security'

function parsePayload(payload: string) {
  try {
    return filterSensitiveData(JSON.parse(payload)) as Record<string, unknown>
  } catch {
    return { raw: payload.slice(0, 2000) }
  }
}

export async function GET() {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const [events, runs] = await Promise.all([
      db.event.findMany({
        where: { organizationId: auth.organizationId },
        orderBy: { timestamp: 'desc' },
        take: 200,
        include: { actor: { select: { id: true, name: true, code: true, avatarColor: true } } },
      }),
      db.agentRun.findMany({
        where: { organizationId: auth.organizationId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          agent: { select: { id: true, name: true, code: true, avatarColor: true } },
          campaignItem: { select: { id: true, code: true, title: true, status: true } },
          steps: { orderBy: { sequence: 'asc' } },
        },
      }),
    ])

    const eventPayloads = new Map(events.map((event) => [event.id, parsePayload(event.payload)]))
    const issueIds = new Set(runs.map((run) => run.issueId).filter((value): value is string => Boolean(value)))
    const issueCodes = new Set<string>()
    for (const payload of eventPayloads.values()) {
      if (typeof payload.issueId === 'string') issueIds.add(payload.issueId)
      if (typeof payload.issueCode === 'string') issueCodes.add(payload.issueCode)
    }

    const issues = issueIds.size || issueCodes.size
      ? await db.issue.findMany({
          where: {
            organizationId: auth.organizationId,
            OR: [
              ...(issueIds.size ? [{ id: { in: [...issueIds] } }] : []),
              ...(issueCodes.size ? [{ code: { in: [...issueCodes] } }] : []),
            ],
          },
          select: { id: true, code: true, title: true, status: true, priority: true },
        })
      : []
    const issuesById = new Map(issues.map((issue) => [issue.id, issue]))
    const issuesByCode = new Map(issues.map((issue) => [issue.code, issue]))

    const eventEntries = events.map((event) => {
      const details = eventPayloads.get(event.id) || {}
      const issue = typeof details.issueId === 'string'
        ? issuesById.get(details.issueId)
        : typeof details.issueCode === 'string'
          ? issuesByCode.get(details.issueCode)
          : undefined
      return {
        id: `event:${event.id}`,
        kind: 'EVENT' as const,
        timestamp: event.timestamp,
        action: event.type,
        status: event.severity,
        actor: event.actor || { name: event.actorName, code: 'SYSTEM', avatarColor: '#64748B' },
        summary: event.summary,
        issue: issue || null,
        task: null,
        details,
        steps: [],
      }
    })

    const runEntries = runs.map((run) => ({
      id: `run:${run.id}`,
      kind: 'RUN' as const,
      timestamp: run.startedAt || run.createdAt,
      action: `RUN_${run.triggerType}`,
      status: run.status,
      actor: run.agent,
      summary: run.outputSummary || run.error || `${run.agent.name} ${run.status.toLowerCase()} an assigned task`,
      issue: run.issueId ? issuesById.get(run.issueId) || null : null,
      task: run.campaignItem,
      details: {
        runId: run.id,
        provider: run.provider,
        model: run.model,
        durationMs: run.durationMs,
        usage: { input: run.inputTokens, output: run.outputTokens, cached: run.cachedTokens },
        estimatedCost: Number(run.estimatedCost),
        error: run.error,
      },
      steps: run.steps.map((step) => ({
        id: step.id,
        sequence: step.sequence,
        type: step.type,
        toolName: step.toolName,
        status: step.status,
        startedAt: step.startedAt,
        completedAt: step.completedAt,
        inputSummary: step.inputSummary,
        outputSummary: step.outputSummary,
        error: step.error,
      })),
    }))

    const entries = [...eventEntries, ...runEntries]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 250)

    return NextResponse.json({ entries })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch activity events' }, { status: 500 })
  }
}
