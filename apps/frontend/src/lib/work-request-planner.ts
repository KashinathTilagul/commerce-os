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
const RESEARCH = /\b(research|investigate|background check|deep dive|silent study)\b/i
const INSTAGRAM = /\b(instagram|\bstory\b|\bstories\b|\breel\b|\breels\b|carousel|ig post)\b/i
const SHOPIFY = /\b(shopify|product description)\b/i
const FINANCE_REPORT = /\b(finance|financial|p&l|revenue)\b.{0,40}\b(report|fiscal|fy)\b/i

export function extractExactReply(request: string) {
  return request.match(/(?:reply with exactly|output as (?:a )?reply as)\s*:?\s*(.+)$/i)?.[1]?.trim() || null
}

export function shouldExecuteMedia(plannedType: string | null | undefined, mediaType: string) {
  return !plannedType || plannedType === mediaType
}

export function parseGeneratedMediaJSON<T = Record<string, unknown>>(json: string): T {
  try {
    return JSON.parse(json) as T
  } catch (originalError) {
    let sanitized = ''
    let inString = false
    let escaped = false

    for (const char of json) {
      if (escaped) {
        sanitized += char
        escaped = false
        continue
      }
      if (char === '\\' && inString) {
        sanitized += char
        escaped = true
        continue
      }
      if (char === '"') {
        sanitized += char
        inString = !inString
        continue
      }
      if (inString && char.charCodeAt(0) < 0x20) {
        sanitized += `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`
        continue
      }
      sanitized += char
    }

    try {
      return JSON.parse(sanitized) as T
    } catch {
      // Models drift into JS-object syntax — unquoted keys, single quotes,
      // trailing commas. Repair char-by-char (string-aware) and retry once.
      try {
        return JSON.parse(repairJson(sanitized)) as T
      } catch {
        throw originalError
      }
    }
  }
}

function repairJson(input: string): string {
  let out = ''
  let inString = false
  let escaped = false
  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    if (escaped) { out += char; escaped = false; continue }
    if (inString) {
      if (char === '\\') escaped = true
      else if (char === '"') inString = false
      out += char
      continue
    }
    if (char === '"') { inString = true; out += char; continue }
    if (char === "'") {
      // Convert single-quoted string to double-quoted.
      let j = i + 1
      let inner = ''
      while (j < input.length && input[j] !== "'") {
        if (input[j] === '\\') { inner += input.slice(j, j + 2); j += 2; continue }
        inner += input[j] === '"' ? '\\"' : input[j]
        j++
      }
      out += `"${inner}"`
      i = j
      continue
    }
    if (/[A-Za-z_$]/.test(char)) {
      // Bare identifier — quote it only when it is a key (followed by ':'),
      // so literal true/false/null values stay literals.
      let j = i
      while (j < input.length && /[A-Za-z0-9_$]/.test(input[j])) j++
      const word = input.slice(i, j)
      let k = j
      while (k < input.length && /\s/.test(input[k])) k++
      out += input[k] === ':' ? `"${word}"` : word
      i = j - 1
      continue
    }
    if (char === ',') {
      let j = i + 1
      while (j < input.length && /\s/.test(input[j])) j++
      if (input[j] === '}' || input[j] === ']') continue // drop trailing comma
    }
    out += char
  }
  return out
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
      hidden: false,
      items: CAMPAIGN_ITEMS.map((item) => ({ ...item, dependsOn: [...item.dependsOn] })) as WorkItemDefinition[],
      validations: CAMPAIGN_VALIDATIONS.map((validation) => ({ ...validation })) as WorkValidationDefinition[],
    }
  }

  // Silent research runs invisibly: hidden launch, sanitized activity log.
  if (RESEARCH.test(brief)) {
    return {
      kind: 'RESEARCH' as const,
      label: 'Private research',
      hidden: true,
      items: [{ code: '01', title: 'Background research', type: 'ANSWER', assigneeCode: 'GROWTH', dependsOn: [] }] as WorkItemDefinition[],
      validations: [] as WorkValidationDefinition[],
    }
  }

  const items: Omit<WorkItemDefinition, 'code'>[] = []
  const add = (item: Omit<WorkItemDefinition, 'code'>) => {
    if (!items.some((existing) => existing.type === item.type)) items.push(item)
  }

  const financeReport = FINANCE_REPORT.test(brief)
  if (financeReport) {
    add({ title: 'Prepare finance report from live revenue data', type: 'FINANCE_REPORT', assigneeCode: 'CFO', dependsOn: [] })
  }
  if (SHOPIFY.test(brief)) {
    add({ title: 'Draft Shopify product description update', type: 'SHOPIFY_UPDATE', assigneeCode: 'OPS_MANAGER', dependsOn: [] })
  }
  const instagram = INSTAGRAM.test(brief)
  if (instagram) {
    const format = /carousel/i.test(brief) ? 'carousel' : /\breels?\b/i.test(brief) ? 'reel' : /stor(y|ies)/i.test(brief) ? 'story' : 'feed'
    add({ title: `Create Instagram ${format} asset`, type: 'SOCIAL_POST', assigneeCode: 'DES_IMG', dependsOn: [] })
  }

  if (/\b(email|investor letter|outreach|newsletter|message|caption|copy|blog|article|post)\b/i.test(brief)) {
    add({ title: 'Write requested content', type: 'CONTENT', assigneeCode: 'MKT_CONTENT', dependsOn: [] })
  }
  if (!instagram && /\b(image|logo|poster|banner|visual|graphic|mockup|illustration|photo)\b/i.test(brief)) {
    add({ title: 'Generate requested image', type: 'IMAGE', assigneeCode: 'DES_IMG', dependsOn: [] })
  }
  if (!instagram && /\b(video|animation|motion|short film)\b/i.test(brief)) {
    add({ title: 'Generate requested video', type: 'VIDEO', assigneeCode: 'MKT_VIDEO', dependsOn: [] })
  }
  if (/\b(audio|voiceover|voice-over|speech|spoken|sound file|podcast)\b/i.test(brief)) {
    add({ title: 'Generate requested audio', type: 'AUDIO', assigneeCode: 'MKT_VIDEO', dependsOn: [] })
  }
  // FINANCE_REPORT already produces a PDF through the same generator.
  if (!financeReport && /\b(pdf|report|briefing document|document file)\b/i.test(brief)) {
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
    hidden: false,
    items: items.map((item, index) => ({ ...item, code: String(index + 1).padStart(2, '0') })),
    validations: [] as WorkValidationDefinition[],
  }
}
