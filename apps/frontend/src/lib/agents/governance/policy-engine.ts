import { DEFAULT_POLICY_REGISTRY, type PolicyDecision, type ActionPolicy } from './policy-registry'

export interface PolicyCheckInput {
  actionCategory: string
  agentCode: string
  amount?: number
  spendLimit?: number
}

export function evaluateActionPolicy(input: PolicyCheckInput): ActionPolicy {
  const policy = DEFAULT_POLICY_REGISTRY[input.actionCategory]

  if (!policy) {
    return {
      actionCategory: input.actionCategory,
      decision: 'REQUIRE_APPROVAL',
      approvalType: 'STRATEGIC',
      description: `Unrecognized action category '${input.actionCategory}' requires founder sign-off`,
    }
  }

  // Check spend threshold
  if (input.actionCategory === 'BUDGET_SPEND' && input.amount && input.spendLimit) {
    if (input.amount > input.spendLimit) {
      return {
        ...policy,
        decision: 'REQUIRE_APPROVAL',
        description: `Requested spend (₹${input.amount}) exceeds agent budget limit (₹${input.spendLimit})`,
      }
    }
  }

  return policy
}
