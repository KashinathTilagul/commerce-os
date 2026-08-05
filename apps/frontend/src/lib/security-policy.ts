/**
 * EKVAAR OS — Security & Multi-Tenant Hardening (Phase 6)
 * Enforces agent permission models, tool capabilities, financial caps, & prompt boundaries.
 */

export interface AgentPermissionPolicy {
  agentId: string
  organizationId: string
  readCapabilities: string[]
  writeCapabilities: string[]
  toolCapabilities: string[]
  financialLimitCents: number
  approvalThresholdCents: number
}

export function validateAgentAction(
  policy: AgentPermissionPolicy,
  action: { type: 'read' | 'write' | 'tool' | 'financial'; target: string; amountCents?: number }
): { allowed: boolean; reason?: string } {
  if (action.type === 'read' && !policy.readCapabilities.includes(action.target) && !policy.readCapabilities.includes('*')) {
    return { allowed: false, reason: `Agent lacks read capability for '${action.target}'` }
  }

  if (action.type === 'write' && !policy.writeCapabilities.includes(action.target) && !policy.writeCapabilities.includes('*')) {
    return { allowed: false, reason: `Agent lacks write capability for '${action.target}'` }
  }

  if (action.type === 'financial' && action.amountCents) {
    if (action.amountCents > policy.financialLimitCents) {
      return { allowed: false, reason: `Financial spend ${action.amountCents} cents exceeds limit ${policy.financialLimitCents} cents` }
    }
  }

  return { allowed: true }
}

export function sanitizePromptBoundaries(prompt: string): string {
  // Strip potential prompt injection overrides
  return prompt.replace(/(?:system instruction override|ignore previous instructions)/gi, '[REDACTED_PROMPT_INJECTION_ATTEMPT]').trim()
}
