import { db } from '@/lib/db'

type ActionRecord = {
  type: string
  target: string
  ts: number
}

type AgentState = {
  actions: ActionRecord[]
  failures: number
}

const state = new Map<string, AgentState>()

export const ReflectorState = state

export function recordAction(agentCode: string, type: string, target: string) {
  if (!state.has(agentCode)) {
    state.set(agentCode, { actions: [], failures: 0 })
  }
  const agentState = state.get(agentCode)!
  agentState.actions.push({ type, target, ts: Date.now() })
}

export function recordFailure(agentCode: string) {
  if (!state.has(agentCode)) {
    state.set(agentCode, { actions: [], failures: 0 })
  }
  const agentState = state.get(agentCode)!
  agentState.failures += 1
}

export function resetFailures(agentCode: string) {
  if (!state.has(agentCode)) {
    state.set(agentCode, { actions: [], failures: 0 })
  }
  const agentState = state.get(agentCode)!
  agentState.failures = 0
}

export function shouldEscalate(agentCode: string): { escalate: boolean; reason?: string } {
  const agentState = state.get(agentCode)
  if (!agentState) return { escalate: false }

  if (agentState.failures >= 5) {
    return { escalate: true, reason: '5+ consecutive failures' }
  }

  const now = Date.now()
  const recent60s = agentState.actions.filter(a => now - a.ts < 60000)
  const recent30s = agentState.actions.filter(a => now - a.ts < 30000)

  const freq60s = new Map<string, number>()
  for (const a of recent60s) {
    const key = a.type
    freq60s.set(key, (freq60s.get(key) || 0) + 1)
    if (freq60s.get(key)! >= 3) {
      return { escalate: true, reason: `Same action repeated 3+ times in 60 seconds` }
    }
  }

  const freqExact30s = new Map<string, number>()
  for (const a of recent30s) {
    const key = `${a.type}:${a.target}`
    freqExact30s.set(key, (freqExact30s.get(key) || 0) + 1)
    if (freqExact30s.get(key)! >= 3) {
      return { escalate: true, reason: `Identical API call repeated 3+ times in 30 seconds` }
    }
  }

  return { escalate: false }
}

export async function escalateToFounder(organizationId: string, agentCode: string, reason: string) {
  const agent = await db.agent.findFirst({ where: { organizationId, code: agentCode } })
  if (!agent) throw new Error("Agent not found")
  
  await db.approval.create({
    data: {
      organizationId,
      type: 'STRATEGIC',
      title: `Agent ${agentCode} requires intervention`,
      description: reason,
      status: 'PENDING',
      requesterId: agent.id,
      code: `APR-${Date.now()}`
    }
  })
}

export function cleanup() {
  const now = Date.now()
  for (const [code, agentState] of state.entries()) {
    agentState.actions = agentState.actions.filter(a => now - a.ts < 300000)
    if (agentState.actions.length === 0 && agentState.failures === 0) {
      state.delete(code)
    }
  }
}

// Cleanup interval
if (typeof setInterval !== 'undefined') {
  setInterval(cleanup, 60000)
}
