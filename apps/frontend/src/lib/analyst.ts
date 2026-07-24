import { z } from 'zod'
import { db } from './db'
import { routeObject, routeText } from './ai-router'

// ── Plan-then-execute analyst (PromptQL pattern) ─────────────────────────────
// The LLM never writes SQL. It emits a constrained QueryPlan over a whitelisted
// schema; the server validates it, forces userId scoping, and runs a read-only
// Prisma aggregate/list. Then a second call summarizes the REAL rows. Answers
// are computed, not hallucinated.

// Whitelist: dataset → { model key, numeric fields (aggregatable), dimension
// fields (filter/group), date field }. Anything not listed is rejected.
const DATASETS = {
  orders:       { model: 'order',       nums: ['total', 'itemsCount'],                dims: ['status', 'paymentStatus', 'channel', 'customerCity'], date: 'createdAt' },
  transactions: { model: 'transaction', nums: ['amount'],                             dims: ['type', 'category'],                                   date: 'date' },
  products:     { model: 'product',     nums: ['price', 'cost', 'stock'],             dims: ['house', 'color', 'category', 'status'],               date: 'createdAt' },
  customers:    { model: 'customer',    nums: ['totalSpent', 'totalOrders'],          dims: ['tier', 'city'],                                       date: 'joinedAt' },
  campaigns:    { model: 'campaign',    nums: ['budget', 'spend', 'impressions', 'engagement'], dims: ['pillar', 'status', 'channel'],             date: 'startDate' },
  issues:       { model: 'issue',       nums: [],                                     dims: ['status', 'priority', 'type', 'department'],           date: 'createdAt' },
  agents:       { model: 'agent',       nums: ['tokenSpend', 'successRate', 'tasksTotal'], dims: ['department', 'status'],                          date: 'createdAt' },
} as const
type DatasetName = keyof typeof DATASETS

const PlanSchema = z.object({
  dataset: z.enum(Object.keys(DATASETS) as [DatasetName, ...DatasetName[]]),
  operation: z.enum(['aggregate', 'list']),
  metrics: z.array(z.object({
    fn: z.enum(['count', 'sum', 'avg', 'min', 'max']),
    field: z.string().optional().describe('numeric field; omit for count'),
  })).optional(),
  groupBy: z.string().optional().describe('a single dimension field to group by'),
  filters: z.array(z.object({
    field: z.string(),
    op: z.enum(['eq', 'gt', 'gte', 'lt', 'lte', 'contains', 'in']),
    value: z.union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))]),
  })).optional(),
  timeRange: z.enum(['today', '7d', '30d', 'mtd', 'ytd', 'all']).optional(),
  limit: z.number().int().min(1).max(50).optional(),
})
export type QueryPlan = z.infer<typeof PlanSchema>

function timeFloor(range: string): Date | null {
  const now = new Date()
  switch (range) {
    case 'today': return new Date(now.getFullYear(), now.getMonth(), now.getDate())
    case '7d':    return new Date(now.getTime() - 7 * 86400000)
    case '30d':   return new Date(now.getTime() - 30 * 86400000)
    case 'mtd':   return new Date(now.getFullYear(), now.getMonth(), 1)
    case 'ytd':   return new Date(now.getFullYear(), 0, 1)
    default:      return null
  }
}

// Validate the plan against the whitelist and run it read-only, always scoped to userId.
async function runPlan(userId: string, plan: QueryPlan): Promise<any> {
  const ds = DATASETS[plan.dataset]
  const allowed = new Set<string>([...ds.nums, ...ds.dims])
  const model = (db as any)[ds.model]

  // Build where — userId ALWAYS enforced by us, never by the model.
  const where: any = { userId }
  for (const f of plan.filters || []) {
    if (!allowed.has(f.field)) throw new Error(`Field not queryable: ${f.field}`)
    if (f.op === 'eq') where[f.field] = f.value
    else if (f.op === 'contains') where[f.field] = { contains: String(f.value) }
    else if (f.op === 'in') where[f.field] = { in: Array.isArray(f.value) ? f.value : [f.value] }
    else where[f.field] = { [f.op]: f.value }
  }
  const floor = plan.timeRange ? timeFloor(plan.timeRange) : null
  if (floor) where[ds.date] = { gte: floor }

  if (plan.operation === 'list') {
    const select: any = { id: true }
    for (const c of [...ds.nums, ...ds.dims]) select[c] = true
    return model.findMany({ where, select, take: Math.min(plan.limit ?? 20, 50), orderBy: { [ds.date]: 'desc' } })
  }

  // aggregate — validate metric fields are numeric; assemble _sum/_avg/etc.
  const agg: any = { _count: true }
  for (const m of plan.metrics || [{ fn: 'count' }]) {
    if (m.fn === 'count') continue
    if (!m.field || !(ds.nums as readonly string[]).includes(m.field)) throw new Error(`${m.fn} needs a numeric field of ${plan.dataset}`)
    const key = `_${m.fn}` // _sum _avg _min _max
    ;(agg[key] ??= {})[m.field] = true
  }

  if (plan.groupBy) {
    if (!(ds.dims as readonly string[]).includes(plan.groupBy)) throw new Error(`Cannot group by: ${plan.groupBy}`)
    return model.groupBy({ by: [plan.groupBy], where, ...agg })
  }
  return model.aggregate({ where, ...agg })
}

export interface AnalystResult { answer: string; plan: QueryPlan; data: any; provider?: string }

// Full pipeline: question → plan → execute → grounded answer.
export async function analyze(userId: string, question: string): Promise<AnalystResult> {
  const schemaHint = Object.entries(DATASETS)
    .map(([name, d]) => `- ${name}: numeric[${d.nums.join(', ') || 'none'}] dims[${d.dims.join(', ')}] date=${d.date}`)
    .join('\n')

  const { object: plan } = await routeObject<QueryPlan>('reasoning', {
    schema: PlanSchema,
    system: `You are EKVAAR's data analyst. Convert the founder's question into a query plan over ONLY these datasets (use exact field names; never invent fields):\n${schemaHint}\n\nUse 'aggregate' with metrics/groupBy for "how many / total / average / by X"; use 'list' to show individual rows. Add timeRange for "this month" (mtd), "this year" (ytd), "last 30 days" (30d), "today". Money fields are in INR.`,
    prompt: question,
    temperature: 0,
  })

  const data = await runPlan(userId, plan)

  const { text } = await routeText('default', {
    system: `You are EKVAAR's data analyst. Answer the founder's question from the computed result below — cite the exact numbers, INR for money, concise (1-3 sentences). Never invent figures beyond the data.`,
    prompt: `Question: ${question}\n\nQuery plan: ${JSON.stringify(plan)}\n\nComputed result: ${JSON.stringify(data)}`,
    temperature: 0.3,
  })

  return { answer: text, plan, data }
}
