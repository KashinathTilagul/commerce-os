/**
 * Executive Intelligence Engine & Priority Engine (EKVAAR OS v3.2)
 * 
 * ARCHITECTURAL BOUNDARY:
 * Sits between Event Bus/AI Workforce Agents and the Window Orchestrator.
 * Answers: Is this real? Is this important? Does it affect revenue? Can AI solve it? Does Founder need to know?
 * 
 * Handlers evaluate business logic & confidence, then pass pure display decisions to WindowOrchestrator.
 */

import { WindowOrchestrator } from '@/lib/window-orchestrator'
import { ConfidenceEngine } from '@/lib/intelligence/confidence-engine'

export type EventSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface AgentEvent {
  id: string
  organizationId: string
  sourceAgent: string
  title: string
  summary: string
  severity: EventSeverity
  category: 'INVENTORY' | 'MARKETING' | 'FINANCE' | 'OPERATIONS' | 'APPROVAL'
  impactAmount?: number
  evidence?: string
  recommendedAction?: string
  targetAppId?: string
  payload?: any
  createdAt: Date
}

export interface DecisionItem {
  id: string
  organizationId: string
  agentName: string
  actionTitle: string
  description: string
  impact: string
  confidenceScore: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  suggestedInput?: any
  createdAt: Date
}

export interface BusinessHealthStatus {
  overall: 'EXCELLENT' | 'GOOD' | 'ATTENTION_REQUIRED' | 'CRITICAL'
  metrics: {
    revenue: { status: 'GREEN' | 'YELLOW' | 'RED'; label: string; trend: string }
    inventory: { status: 'GREEN' | 'YELLOW' | 'RED'; label: string; trend: string }
    marketing: { status: 'GREEN' | 'YELLOW' | 'RED'; label: string; trend: string }
    cashFlow: { status: 'GREEN' | 'YELLOW' | 'RED'; label: string; trend: string }
    operations: { status: 'GREEN' | 'YELLOW' | 'RED'; label: string; trend: string }
  }
}

export class ExecutiveIntelligenceEngine {
  /**
   * Evaluates incoming agent event, calculates confidence & revenue impact,
   * then instructs WindowOrchestrator to perform a display action.
   */
  static processEvent(event: AgentEvent) {
    const targetAppId = event.targetAppId || 'executive_brief'

    // Evaluate confidence with decay
    const confidence = ConfidenceEngine.evaluate({
      businessObjectType: event.category,
      action: event.title,
      historicalDataPoints: 42,
      dataQualityScore: 92,
      dataAgeMinutes: 15,
    })

    if (event.severity === 'CRITICAL') {
      // Direct escalation to living window
      WindowOrchestrator.execute({
        type: 'OPEN_OR_FOCUS',
        appId: targetAppId,
        title: event.title,
        severity: 'CRITICAL',
        payload: { ...event, confidence },
      })
      return { action: 'LAUNCH_WINDOW', targetAppId }
    }

    if (event.severity === 'HIGH') {
      // Raise toast notification
      WindowOrchestrator.execute({
        type: 'SHOW_TOAST',
        appId: targetAppId,
        title: event.title,
        severity: 'HIGH',
        payload: { ...event, confidence },
      })
      return { action: 'SHOW_TOAST', targetAppId }
    }

    // Medium/Low: Aggregate into Executive Brief / Founder Inbox
    return { action: 'ADD_TO_BRIEF', targetAppId }
  }

  /**
   * Retrieves aggregated business health for Executive Brief
   */
  static async getBusinessHealth(organizationId: string): Promise<BusinessHealthStatus> {
    return {
      overall: 'GOOD',
      metrics: {
        revenue: { status: 'GREEN', label: 'Revenue', trend: '↑ +12% this week' },
        inventory: { status: 'YELLOW', label: 'Inventory', trend: '2 items low stock' },
        marketing: { status: 'RED', label: 'Marketing', trend: 'ROAS dropped 18%' },
        cashFlow: { status: 'GREEN', label: 'Cash Flow', trend: 'Positive (+₹1.2L)' },
        operations: { status: 'GREEN', label: 'Operations', trend: 'All syncs active' },
      },
    }
  }

  /**
   * Retrieves active pending decision items requiring 4-way approval
   */
  static getPendingApprovals(organizationId: string): DecisionItem[] {
    return [
      {
        id: 'dec_1',
        organizationId,
        agentName: 'Inventory Ops Agent',
        actionTitle: 'Restock Black Oversized Tee (250 units)',
        description: 'Current stock will deplete in 6 days based on 14% demand surge.',
        impact: 'Prevents ₹1,84,000 estimated lost revenue',
        confidenceScore: 94,
        riskLevel: 'LOW',
        createdAt: new Date(),
      },
      {
        id: 'dec_2',
        organizationId,
        agentName: 'Growth Marketing Agent',
        actionTitle: 'Pause "Monsoon Drop" Meta Campaign',
        description: 'ROAS dropped below target threshhold (1.4x vs 2.2x target).',
        impact: 'Saves ₹24,000/day in ineffective ad spend',
        confidenceScore: 89,
        riskLevel: 'MEDIUM',
        createdAt: new Date(),
      },
      {
        id: 'dec_3',
        organizationId,
        agentName: 'Customer Success Agent',
        actionTitle: 'Launch Instagram Reel Sequence for Top 500 VIPs',
        description: 'Targeted engagement campaign for repeat buyers.',
        impact: '+₹42,000 projected upsell revenue',
        confidenceScore: 91,
        riskLevel: 'LOW',
        createdAt: new Date(),
      },
    ]
  }

  /**
   * Retrieves needs attention items with justification & evidence
   */
  static getNeedsAttentionItems(organizationId: string) {
    return [
      {
        id: 'att_1',
        category: 'INVENTORY',
        severity: 'CRITICAL' as EventSeverity,
        title: 'Black Oversized Tee Stockout Warning',
        evidence: 'Demand +14% over trailing 7 days. Remaining inventory: 42 units.',
        impact: '₹1,84,000 lost revenue risk',
        recommendedAction: 'Approve PO #1042 for 250 units from primary vendor.',
      },
      {
        id: 'att_2',
        category: 'MARKETING',
        severity: 'HIGH' as EventSeverity,
        title: 'Meta ROAS Decline Detected',
        evidence: 'Ad set #9401 CPM increased 32%, converting at 1.1%',
        impact: '₹24,000 daily budget waste',
        recommendedAction: 'Reallocate budget to high-performing "White Tee Reels" ad set.',
      },
    ]
  }
}
