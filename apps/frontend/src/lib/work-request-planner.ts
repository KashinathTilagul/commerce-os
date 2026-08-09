import { CAMPAIGN_ITEMS, CAMPAIGN_VALIDATIONS } from './campaign-blueprint'

export interface WorkItemDefinition {
  code: string
  title: string
  type: string
  assigneeCode?: string
  serviceKey?: string
  dependsOn: string[]
}

export interface WorkValidationDefinition {
  domain: 'BRAND' | 'ORIGINALITY' | 'MARGIN' | 'TRACKING' | 'COMPLIANCE' | 'INVENTORY' | 'TECHNICAL' | 'DEVICE'
  validatorCode: string
  itemCode?: string
}

const FULL_CAMPAIGN = /(?:\b(?:launch|run|build|plan)\b.{0,45}\b(?:campaign|collection launch|product launch)\b)|(?:\b(?:campaign|collection)\b.{0,45}\b(?:launch|rollout|go live)\b)/i

export function extractExactReply(request: string) {
  return request.match(/(?:reply with exactly|output as (?:a )?reply as)\s*:?\s*(.+)$/i)?.[1]?.trim() || null
}

const SPECIALISTS = [
  { match: /\b(revenue|profit|margin|cash|finance|cost|budget|sales)\b/i, assigneeCode: 'CFO', type: 'FINANCE_QUERY', title: 'Finance answer' },
  { match: /\b(order|inventory|shipment|delivery|supplier|operations|stock)\b/i, assigneeCode: 'OPS_MANAGER', type: 'OPERATIONS_QUERY', title: 'Operations answer' },
  { match: /\b(legal|compliance|policy|contract|trademark|copyright)\b/i, assigneeCode: 'LEG_COMPLIANCE', type: 'COMPLIANCE_QUERY', title: 'Compliance answer' },
  { match: /\b(product|sku|assortment|collection|roadmap)\b/i, assigneeCode: 'CPO', type: 'PRODUCT_QUERY', title: 'Product answer' },
  { match: /\b(growth|market|competitor|strategy|acquisition)\b/i, assigneeCode: 'GROWTH', type: 'STRATEGY', title: 'Strategy answer' },
] as const

export function planWorkRequest(brief: string) {
  if (FULL_CAMPAIGN.test(brief)) {
    return {
      kind: 'CAMPAIGN' as const,
      label: 'Full campaign workflow',
      items: CAMPAIGN_ITEMS.map((item) => ({ ...item, dependsOn: [...item.dependsOn] })) as WorkItemDefinition[],
      validations: CAMPAIGN_VALIDATIONS.map((validation) => ({ ...validation })) as WorkValidationDefinition[],
    }
  }

  const items: Omit<WorkItemDefinition, 'code'>[] = []
  const add = (item: Omit<WorkItemDefinition, 'code'>) => {
    if (!items.some((existing) => existing.type === item.type)) items.push(item)
  }

  if (/\b(email|investor letter|outreach|newsletter|message|caption|copy|blog|article|post)\b/i.test(brief)) {
    add({ title: 'Write requested content', type: 'CONTENT', assigneeCode: 'MKT_CONTENT', dependsOn: [] })
  }
  if (/\b(image|logo|poster|banner|visual|graphic|mockup|illustration|photo)\b/i.test(brief)) {
    add({ title: 'Generate requested image', type: 'IMAGE', assigneeCode: 'DES_IMG', dependsOn: [] })
  }
  if (/\b(video|reel|animation|motion|short film)\b/i.test(brief)) {
    add({ title: 'Generate requested video', type: 'VIDEO', assigneeCode: 'MKT_VIDEO', dependsOn: [] })
  }
  if (/\b(pdf|report|briefing document|document file)\b/i.test(brief)) {
    add({ title: 'Generate requested report', type: 'PDF', assigneeCode: 'EXE_SUMMARY', dependsOn: [] })
  }

  if (items.length === 0) {
    const specialist = SPECIALISTS.find(({ match }) => match.test(brief))
    add(specialist
      ? { title: specialist.title, type: specialist.type, assigneeCode: specialist.assigneeCode, dependsOn: [] }
      : { title: 'Answer founder request', type: 'ANSWER', assigneeCode: 'CEO', dependsOn: [] })
  }

  return {
    kind: 'REQUEST' as const,
    label: items.length === 1 ? items[0].title : `${items.length} requested deliverables`,
    items: items.map((item, index) => ({ ...item, code: String(index + 1).padStart(2, '0') })),
    validations: [] as WorkValidationDefinition[],
  }
}
