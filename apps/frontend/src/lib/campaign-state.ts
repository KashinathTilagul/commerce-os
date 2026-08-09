import type { CampaignAssigneeType, CampaignLaunchStatus } from '@prisma/client'

const ALLOWED_TRANSITIONS: Record<CampaignLaunchStatus, readonly CampaignLaunchStatus[]> = {
  DRAFT: ['PLANNING', 'CANCELLED'],
  PLANNING: ['EXECUTING', 'BLOCKED', 'CANCELLED'],
  EXECUTING: ['REVIEW', 'BLOCKED', 'CANCELLED'],
  REVIEW: ['EXECUTING', 'APPROVAL_PENDING', 'BLOCKED', 'CANCELLED'],
  APPROVAL_PENDING: ['APPROVED', 'EXECUTING', 'BLOCKED', 'CANCELLED'],
  APPROVED: ['PUBLISHING', 'BLOCKED', 'CANCELLED'],
  PUBLISHING: ['PUBLISHED', 'PARTIALLY_PUBLISHED', 'BLOCKED'],
  PUBLISHED: [],
  PARTIALLY_PUBLISHED: ['PUBLISHING', 'PUBLISHED', 'BLOCKED'],
  BLOCKED: ['PLANNING', 'EXECUTING', 'REVIEW', 'APPROVAL_PENDING', 'APPROVED', 'PUBLISHING', 'CANCELLED'],
  CANCELLED: [],
}

export function assertCampaignLaunchTransition(from: CampaignLaunchStatus, to: CampaignLaunchStatus) {
  if (from === to) return
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Campaign launch cannot move from ${from} to ${to}`)
  }
}

export function assertUserManagedCampaignStatus(status: CampaignLaunchStatus) {
  if (['APPROVED', 'PUBLISHING', 'PUBLISHED', 'PARTIALLY_PUBLISHED'].includes(status)) {
    throw new Error(`${status} is controlled by the approval and publication coordinators`)
  }
}

export function assertCampaignItemOwner(owner: {
  assigneeType: CampaignAssigneeType
  assigneeId?: string | null
  serviceKey?: string | null
}) {
  const hasAgent = Boolean(owner.assigneeId)
  const hasService = Boolean(owner.serviceKey)
  if (owner.assigneeType === 'AGENT' && (!hasAgent || hasService)) {
    throw new Error('Agent-owned campaign items require assigneeId and cannot set serviceKey')
  }
  if (owner.assigneeType === 'SYSTEM' && (!hasService || hasAgent)) {
    throw new Error('System-owned campaign items require serviceKey and cannot set assigneeId')
  }
}

export function assertAcyclicDependencies(itemIds: string[], edges: Array<{ itemId: string; dependsOnId: string }>) {
  const ids = new Set(itemIds)
  if (ids.size !== itemIds.length) throw new Error('Campaign item IDs must be unique')

  const edgeKeys = new Set<string>()
  const incoming = new Map(itemIds.map((id) => [id, 0]))
  const outgoing = new Map(itemIds.map((id) => [id, [] as string[]]))

  for (const edge of edges) {
    if (!ids.has(edge.itemId) || !ids.has(edge.dependsOnId)) {
      throw new Error('Campaign dependencies must reference items from the same launch')
    }
    if (edge.itemId === edge.dependsOnId) throw new Error('Campaign items cannot depend on themselves')
    const key = `${edge.itemId}\0${edge.dependsOnId}`
    if (edgeKeys.has(key)) throw new Error('Duplicate campaign dependency')
    edgeKeys.add(key)
    incoming.set(edge.itemId, (incoming.get(edge.itemId) ?? 0) + 1)
    outgoing.get(edge.dependsOnId)!.push(edge.itemId)
  }

  const ready = itemIds.filter((id) => incoming.get(id) === 0)
  let visited = 0
  while (ready.length) {
    const current = ready.pop()!
    visited += 1
    for (const dependent of outgoing.get(current) ?? []) {
      const remaining = (incoming.get(dependent) ?? 0) - 1
      incoming.set(dependent, remaining)
      if (remaining === 0) ready.push(dependent)
    }
  }

  if (visited !== itemIds.length) throw new Error('Campaign dependencies contain a cycle')
}
