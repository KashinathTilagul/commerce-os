// Rule-based intent parser - No LLM, pure keyword matching
import { z } from 'zod'

const DEPARTMENT_KEYWORDS: Record<string, string[]> = {
  MARKETING: ['campaign', 'launch', 'promo', 'social', 'ad', 'instagram', 'facebook', 'twitter', 'marketing', 'brand', 'content', 'email'],
  CREATIVE: ['design', 'visual', 'brand', 'image', 'video', 'graphic', 'creative', 'artwork', 'logo', 'banner'],
  TECHNOLOGY: ['bug', 'fix', 'feature', 'api', 'integration', 'tech', 'code', 'develop', 'build', 'deploy'],
  FINANCE: ['invoice', 'budget', 'payment', 'report', 'finance', 'cost', 'expense', 'revenue', 'pricing'],
  OPERATIONS: ['operation', 'supply', 'inventory', 'logistics', 'ship', 'fulfill', 'stock', 'order'],
  CUSTOMER: ['support', 'customer', 'service', 'help', 'complaint', 'ticket', 'response'],
  GROWTH: ['growth', 'acquisition', 'retention', 'analytics', 'metric', 'optimize', 'scale'],
  RESEARCH: ['research', 'analysis', 'study', 'trend', 'market', 'competitor', 'insight'],
  HR: ['hire', 'recruit', 'team', 'employee', 'onboard', 'training', 'hr'],
  LEGAL: ['legal', 'contract', 'compliance', 'policy', 'document', 'review'],
  EXECUTIVE: ['strategy', 'plan', 'mission', 'executive', 'decision']
}

const TASK_TYPE_KEYWORDS: Record<string, string[]> = {
  CAMPAIGN_LAUNCH: ['launch', 'campaign', 'promo', 'announcement'],
  PRODUCT_LAUNCH: ['product', 'new', 'release', 'drop'],
  CONTENT_CREATION: ['create', 'write', 'design', 'content', 'post'],
  REPORT_GENERATION: ['report', 'analysis', 'summary', 'document'],
  BUG_FIX: ['bug', 'fix', 'broken', 'error', 'issue'],
  FEATURE_BUILD: ['feature', 'build', 'develop', 'implement', 'add'],
  INTEGRATION: ['integrate', 'connect', 'sync', 'api'],
  APPROVAL: ['approve', 'review', 'sign', 'authorize'],
  RESEARCH: ['research', 'analyze', 'study', 'investigate']
}

const PRIORITY_KEYWORDS: Record<string, string[]> = {
  P0: ['urgent', 'critical', 'immediately', 'asap', 'emergency', 'blocker'],
  P1: ['high', 'important', 'priority', 'soon'],
  P2: ['medium', 'normal', 'regular'],
  P3: ['low', 'later', 'backlog', 'eventually']
}

export const IntentSchema = z.object({
  department: z.string(),
  taskType: z.string(),
  priority: z.string(),
  keywords: z.array(z.string()),
  confidence: z.number().min(0).max(1)
})

export type Intent = z.infer<typeof IntentSchema>

function extractKeywords(text: string): string[] {
  const normalized = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2)
  return [...new Set(normalized)]
}

function matchKeywords(textKeywords: string[], patterns: string[]): string[] {
  return patterns.filter(pattern => 
    textKeywords.some(kw => kw.includes(pattern) || pattern.includes(kw))
  )
}

export function parseIntent(prompt: string): Intent {
  const keywords = extractKeywords(prompt)
  
  // Find matching department
  let bestDepartment = 'OPERATIONS'
  let bestDepartmentScore = 0
  for (const [dept, deptKeywords] of Object.entries(DEPARTMENT_KEYWORDS)) {
    const matches = matchKeywords(keywords, deptKeywords)
    if (matches.length > bestDepartmentScore) {
      bestDepartmentScore = matches.length
      bestDepartment = dept
    }
  }
  
  // Find matching task type
  let bestTaskType = 'TASK'
  let bestTaskTypeScore = 0
  for (const [type, typeKeywords] of Object.entries(TASK_TYPE_KEYWORDS)) {
    const matches = matchKeywords(keywords, typeKeywords)
    if (matches.length > bestTaskTypeScore) {
      bestTaskTypeScore = matches.length
      bestTaskType = type
    }
  }
  
  // Find matching priority
  let bestPriority = 'P2'
  for (const [priority, priorityKeywords] of Object.entries(PRIORITY_KEYWORDS)) {
    if (matchKeywords(keywords, priorityKeywords).length > 0) {
      bestPriority = priority
      break
    }
  }
  
  const confidence = Math.min(1, (bestDepartmentScore + bestTaskTypeScore) / 4)
  
  return {
    department: bestDepartment,
    taskType: bestTaskType,
    priority: bestPriority,
    keywords,
    confidence: Math.max(0.5, confidence)
  }
}

export function routeToDepartment(prompt: string): string {
  const intent = parseIntent(prompt)
  return intent.department
}

export function extractTaskType(prompt: string): string {
  const intent = parseIntent(prompt)
  return intent.taskType
}

export function extractPriority(prompt: string): string {
  const intent = parseIntent(prompt)
  return intent.priority
}
