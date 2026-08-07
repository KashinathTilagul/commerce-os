export type PolicyDecision = 'ALLOW' | 'REQUIRE_APPROVAL' | 'DENY'

export interface ActionPolicy {
  actionCategory: string
  decision: PolicyDecision
  description: string
  approvalType?: 'BUDGET' | 'STRATEGIC' | 'HIRING' | 'CAMPAIGN' | 'VENDOR'
}

export const DEFAULT_POLICY_REGISTRY: Record<string, ActionPolicy> = {
  READ_INTERNAL_DATA: {
    actionCategory: 'READ_INTERNAL_DATA',
    decision: 'ALLOW',
    description: 'Querying database, reading order metrics, browsing internal catalog',
  },
  CREATE_DRAFT: {
    actionCategory: 'CREATE_DRAFT',
    decision: 'ALLOW',
    description: 'Creating internal drafts, documents, or content briefs',
  },
  CREATE_ISSUE: {
    actionCategory: 'CREATE_ISSUE',
    decision: 'ALLOW',
    description: 'Creating internal task tickets or subtasks',
  },
  COMMENT_ISSUE: {
    actionCategory: 'COMMENT_ISSUE',
    decision: 'ALLOW',
    description: 'Adding comments or progress notes to tickets',
  },
  DELEGATE_TO_REPORT: {
    actionCategory: 'DELEGATE_TO_REPORT',
    decision: 'ALLOW',
    description: 'Delegating work down the organizational hierarchy tree',
  },
  SEND_EMAIL: {
    actionCategory: 'SEND_EMAIL',
    decision: 'REQUIRE_APPROVAL',
    approvalType: 'STRATEGIC',
    description: 'Sending external emails to customers or partners',
  },
  PUBLISH_SOCIAL: {
    actionCategory: 'PUBLISH_SOCIAL',
    decision: 'REQUIRE_APPROVAL',
    approvalType: 'CAMPAIGN',
    description: 'Publishing social media posts or campaign creative live',
  },
  EXTERNAL_API_WRITE: {
    actionCategory: 'EXTERNAL_API_WRITE',
    decision: 'REQUIRE_APPROVAL',
    approvalType: 'VENDOR',
    description: 'Modifying external Shopify themes, Stripe products, or third-party webhooks',
  },
  BUDGET_SPEND: {
    actionCategory: 'BUDGET_SPEND',
    decision: 'REQUIRE_APPROVAL',
    approvalType: 'BUDGET',
    description: 'Executing paid ads or third-party vendor purchases',
  },
  DELETE_PRODUCTION_DATA: {
    actionCategory: 'DELETE_PRODUCTION_DATA',
    decision: 'DENY',
    description: 'Destructive deletion of production customer or order records',
  },
}
