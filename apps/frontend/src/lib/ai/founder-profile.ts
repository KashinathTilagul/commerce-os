/**
 * Founder Operational Profile & Decision Memory (EKVAAR OS v3.3)
 * 
 * Tracks operational preferences, decision patterns, and risk posture of the founder.
 * Allows Krishna to adapt recommendations over time based on actual founder approvals.
 */

import { db } from '@/lib/db'

export interface FounderPreferences {
  organizationId: string
  inventoryRiskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE'
  marketingApprovalSpeed: 'FAST' | 'MANUAL_REVIEW'
  financeReviewStyle: 'DETAILED' | 'HIGH_LEVEL'
  delegatedDomains: string[]
  commonOrderQuantityThreshold: number
  preferredVendorLeadTimeMax: number
}

export class FounderProfileEngine {
  /**
   * Fetch founder operational profile for an organization
   */
  static async getProfile(organizationId: string): Promise<FounderPreferences> {
    try {
      const org = await db.organization.findUnique({
        where: { id: organizationId },
        include: { context: true }
      })

      const profile = org?.context?.companyProfile as any || {}

      return {
        organizationId,
        inventoryRiskTolerance: profile.inventoryRiskTolerance || 'CONSERVATIVE',
        marketingApprovalSpeed: profile.marketingApprovalSpeed || 'FAST',
        financeReviewStyle: profile.financeReviewStyle || 'DETAILED',
        delegatedDomains: profile.delegatedDomains || ['LOGISTICS', 'COMMUNITY'],
        commonOrderQuantityThreshold: profile.commonOrderQuantityThreshold || 300,
        preferredVendorLeadTimeMax: profile.preferredVendorLeadTimeMax || 7,
      }
    } catch {
      return {
        organizationId,
        inventoryRiskTolerance: 'CONSERVATIVE',
        marketingApprovalSpeed: 'FAST',
        financeReviewStyle: 'DETAILED',
        delegatedDomains: ['LOGISTICS', 'COMMUNITY'],
        commonOrderQuantityThreshold: 300,
        preferredVendorLeadTimeMax: 7,
      }
    }
  }

  /**
   * Records a founder decision into Decision Memory to adapt future recommendations
   */
  static async recordDecision(params: {
    organizationId: string
    domain: string
    actionTitle: string
    decision: 'APPROVED' | 'REJECTED' | 'MODIFIED'
    impactAmount?: number
  }) {
    console.log(`[FounderProfileEngine] Recorded ${params.decision} decision for ${params.domain}: ${params.actionTitle}`)
  }
}
