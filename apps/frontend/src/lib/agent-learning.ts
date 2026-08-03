// Agent Learning System - Pattern storage and retrieval
import { db } from './db'

export interface AgentLearning {
  successfulApproaches: any[]
  failures: Array<{ mistake: any; correction?: string }>
  constraints: string[]
  qualityScore: number
}

export async function prepareAgentWithLearning(
  agentCode: string,
  organizationId: string,
  taskType: string
): Promise<{ successfulApproaches: any[]; failures: any[]; constraints: string[] }> {
  // Get past successful patterns for this task type
  const successfulPatterns = await db.agentPattern.findMany({
    where: {
      agentCode,
      organizationId,
      taskType,
      outcome: 'SUCCESS',
      qualityScore: { gte: 0.7 }
    },
    orderBy: { qualityScore: 'desc' },
    take: 5
  })
  
  // Get past failures for this task type
  const pastFailures = await db.agentPattern.findMany({
    where: {
      agentCode,
      organizationId,
      taskType,
      outcome: 'REJECTED'
    },
    orderBy: { timestamp: 'desc' },
    take: 5
  })
  
  // Get agent's accumulated constraints
  const agent = await db.agent.findFirst({
    where: { code: agentCode, organizationId },
    select: { constraints: true }
  })
  
  let constraints: string[] = []
  if (agent?.constraints) {
    try {
      constraints = JSON.parse(agent.constraints)
    } catch {}
  }
  
  // Add constraints from recent failures
  for (const failure of pastFailures) {
    try {
      const failureData = JSON.parse(failure.rejectionReason || '[]')
      constraints.push(...failureData)
    } catch {}
  }
  
  constraints = [...new Set(constraints)]
  
  return {
    successfulApproaches: successfulPatterns.map(p => {
      try { return JSON.parse(p.approach) } catch { return {} }
    }),
    failures: pastFailures.map(f => ({
      mistake: (() => { try { return JSON.parse(f.approach) } catch { return {} } })(),
      correction: f.correction || undefined
    })),
    constraints
  }
}

export async function storeAgentPattern(
  organizationId: string,
  agentCode: string,
  taskType: string,
  context: any,
  approach: any,
  outcome: 'SUCCESS' | 'REJECTED' | 'REVISED',
  rejectionReason?: string[],
  correction?: string,
  qualityScore: number = 0.5
): Promise<void> {
  await db.agentPattern.create({
    data: {
      organizationId,
      agentCode,
      taskType,
      context: JSON.stringify(context),
      approach: JSON.stringify(approach),
      outcome,
      rejectionReason: rejectionReason ? JSON.stringify(rejectionReason) : null,
      correction,
      qualityScore
    }
  })
  
  // Update agent's aggregate quality score
  await updateAgentQualityScore(organizationId, agentCode)
  
  // If success, update agent's learning history
  if (outcome === 'SUCCESS') {
    await updateAgentLearningHistory(organizationId, agentCode, qualityScore)
  }
  
  // If failure, add constraints to agent
  if (outcome === 'REJECTED' && rejectionReason) {
    await addAgentConstraints(organizationId, agentCode, rejectionReason)
  }
}

async function updateAgentQualityScore(organizationId: string, agentCode: string): Promise<void> {
  const patterns = await db.agentPattern.findMany({
    where: { agentCode, organizationId },
    orderBy: { timestamp: 'desc' },
    take: 20
  })
  
  if (patterns.length === 0) return
  
  // Weighted average (recent tasks weighted higher)
  let totalWeight = 0
  let weightedSum = 0
  
  patterns.forEach((p, idx) => {
    const weight = (idx + 1) / patterns.length
    weightedSum += p.qualityScore * weight
    totalWeight += weight
  })
  
  const newScore = totalWeight > 0 ? weightedSum / totalWeight : 0.5
  
  await db.agent.update({
    where: { code: agentCode, organizationId },
    data: { qualityScore: newScore }
  })
}

async function updateAgentLearningHistory(
  organizationId: string,
  agentCode: string,
  qualityScore: number
): Promise<void> {
  const agent = await db.agent.findFirst({
    where: { code: agentCode, organizationId },
    select: { learningHistory: true }
  })
  
  let history = { totalTasks: 0, successfulTasks: 0, improvedTasks: 0 }
  if (agent?.learningHistory) {
    try { history = JSON.parse(agent.learningHistory) } catch {}
  }
  
  history.totalTasks++
  if (qualityScore >= 0.7) history.successfulTasks++
  if (qualityScore >= 0.8) history.improvedTasks++
  
  await db.agent.update({
    where: { code: agentCode, organizationId },
    data: { learningHistory: JSON.stringify(history) }
  })
}

async function addAgentConstraints(
  organizationId: string,
  agentCode: string,
  reasons: string[]
): Promise<void> {
  const agent = await db.agent.findFirst({
    where: { code: agentCode, organizationId },
    select: { constraints: true }
  })
  
  let constraints: string[] = []
  if (agent?.constraints) {
    try { constraints = JSON.parse(agent.constraints) } catch {}
  }
  
  constraints.push(...reasons)
  constraints = [...new Set(constraints)]
  
  await db.agent.update({
    where: { code: agentCode, organizationId },
    data: { constraints: JSON.stringify(constraints) }
  })
}

export async function shareLearningAcrossDepartment(
  organizationId: string,
  department: string
): Promise<void> {
  const departmentAgents = await db.agent.findMany({
    where: { organizationId, department }
  })
  
  const bestPatterns = await db.agentPattern.findMany({
    where: {
      organizationId,
      agentCode: { in: departmentAgents.map(a => a.code) },
      outcome: 'SUCCESS',
      qualityScore: { gte: 0.8 }
    },
    orderBy: { qualityScore: 'desc' },
    take: 20
  })
  
  // Share best patterns across department agents
  for (const agent of departmentAgents) {
    for (const pattern of bestPatterns) {
      if (pattern.agentCode === agent.code) continue
      
      const existing = await db.agentKnowledge.findFirst({
        where: { agentCode: agent.code, pattern: pattern.approach }
      })
      
      if (!existing) {
        await db.agentKnowledge.create({
          data: {
            organizationId,
            agentCode: agent.code,
            sourceAgent: pattern.agentCode,
            pattern: pattern.approach,
            qualityScore: pattern.qualityScore,
            learned: false
          }
        })
      }
    }
  }
}
