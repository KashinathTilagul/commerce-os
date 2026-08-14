// EKVAAR OS — Seed Extension: Digital Workforce, Issues, Events, Approvals
// Adds the 12-agent C-suite, sample issues, event bus entries, and approval requests

import { db } from '../src/lib/db'

const AGENTS = [
  {
    code: 'FOUNDER',
    name: 'Founder',
    role: 'The Human Interface',
    department: 'EXECUTIVE',
    primeDirective: 'Approve major capital allocations, set the overarching vision, manage system overrides.',
    description: 'The ultimate decision-maker and governor of the system. The OS surfaces only high-leverage decisions to the Founder Inbox.',
    skills: 'vision,governance,override',
    avatarColor: '#0A0A0A',
    isHuman: true,
    tokenBudget: 0,
    tokenSpend: 0,
  },
  {
    code: 'CEO',
    name: 'Aria',
    role: 'Chief Executive Officer',
    department: 'EXECUTIVE',
    primeDirective: 'Break the founder vision into actionable Issues. Resolve cross-departmental conflicts. Monitor holistic company health.',
    description: 'The Orchestrator. Allocates capital, orchestrates other agents, and resolves cross-department conflicts.',
    skills: 'capital_allocation,orchestration,conflict_resolution,strategy',
    avatarColor: '#C8302A',
    tokenBudget: 80000,
    tokenSpend: 52400,
  },
  {
    code: 'CMO',
    name: 'Mira',
    role: 'Chief Marketing Officer',
    department: 'MARKETING',
    primeDirective: 'Drive top-of-funnel growth while protecting the EKVAAR brand voice. ROAS-positive campaigns only.',
    description: 'Analyzes Shopify traffic data, monitors ROAS, spins up digital campaigns, and writes brand-aligned copy.',
    skills: 'campaign_drafting,roas_analysis,ab_testing,copywriting,brand_voice',
    avatarColor: '#D4859B',
    tokenBudget: 60000,
    tokenSpend: 41200,
  },
  {
    code: 'CTO',
    name: 'Vega',
    role: 'Chief Technology Officer',
    department: 'TECHNOLOGY',
    primeDirective: 'Keep the OS infrastructure online. Write, review, and deploy code. Integrate third-party APIs.',
    description: 'Manages software deployments, integrates Shopify/Stripe, and monitors server health.',
    skills: 'python,node,api_integration,git,react_development,postgresql_management',
    avatarColor: '#1F3A5F',
    tokenBudget: 70000,
    tokenSpend: 38900,
  },
  {
    code: 'CFO',
    name: 'Anya',
    role: 'Chief Financial Officer',
    department: 'FINANCE',
    primeDirective: 'Enforce department budgets. Monitor burn rate. Project cash flow. Flag inefficient spend.',
    description: 'Audits expenses, tracks burn rate, and enforces department budgets across all agents.',
    skills: 'ledger_analysis,forecasting,budget_incidents,cash_flow',
    avatarColor: '#2F4F3A',
    tokenBudget: 50000,
    tokenSpend: 18600,
  },
  {
    code: 'COO',
    name: 'Kai',
    role: 'Chief Operating Officer',
    department: 'OPERATIONS',
    primeDirective: 'Monitor physical inventory. Track shipping logistics. Predict stock-outs before they happen.',
    description: 'Manages inventory, supply chain, and fulfillment pipelines. Handles supplier communications.',
    skills: 'inventory_reorder,vendor_sla,fulfillment,supply_chain',
    avatarColor: '#8B7355',
    tokenBudget: 45000,
    tokenSpend: 22100,
  },
  {
    code: 'CCO',
    name: 'Lumen',
    role: 'Chief Creative Officer',
    department: 'CREATIVE',
    primeDirective: 'Generate visual assets that hold the EKVAAR brand book. Ensure brand consistency across all outputs.',
    description: 'Generates visual assets, designs UI mockups, and enforces brand consistency across Marketing outputs.',
    skills: 'image_generation,brand_kit_enforcement,ui_mockups,typography',
    avatarColor: '#D4859B',
    tokenBudget: 55000,
    tokenSpend: 33400,
  },
  {
    code: 'CSM',
    name: 'Sage',
    role: 'Customer Success Manager',
    department: 'CUSTOMER',
    primeDirective: 'Handle complex support tickets. Monitor CSAT. Identify churn risks before they escalate.',
    description: 'Handles complex support tickets, monitors customer satisfaction scores, and identifies churn risks.',
    skills: 'sentiment_analysis,ticket_triaging,retention,churn_prediction',
    avatarColor: '#1F3A5F',
    tokenBudget: 35000,
    tokenSpend: 14200,
  },
  {
    code: 'GROWTH',
    name: 'Pulse',
    role: 'Growth Manager',
    department: 'GROWTH',
    primeDirective: 'Run rapid growth experiments. Identify new channels. Optimize the conversion funnel.',
    description: 'Runs rapid growth experiments, identifies new channels, and optimizes the conversion funnel.',
    skills: 'funnel_analytics,virality_mechanics,experiment_design,channel_discovery',
    avatarColor: '#C8302A',
    tokenBudget: 40000,
    tokenSpend: 28700,
  },
  {
    code: 'RESEARCH',
    name: 'Atlas',
    role: 'Research Manager',
    department: 'RESEARCH',
    primeDirective: 'Gather market intelligence. Research competitors. Compile exhaustive reports for CEO strategy.',
    description: 'Gathers market intelligence, researches competitors, and compiles exhaustive reports for the CEO.',
    skills: 'web_scraping,data_synthesis,literature_review,competitive_intel',
    avatarColor: '#2F4F3A',
    tokenBudget: 35000,
    tokenSpend: 19800,
  },
  {
    code: 'HR',
    name: 'Iris',
    role: 'HR Manager',
    department: 'HR',
    primeDirective: 'Draft onboarding docs for new digital agents. Monitor inter-agent communication for misalignment.',
    description: 'Drafts onboarding docs for new digital agents, monitors inter-agent communication, and handles policy documentation.',
    skills: 'sla_drafting,alignment_monitoring,onboarding,policy',
    avatarColor: '#D4859B',
    tokenBudget: 25000,
    tokenSpend: 8400,
  },
  {
    code: 'LEGAL',
    name: 'Vera',
    role: 'Legal Manager',
    department: 'LEGAL',
    primeDirective: 'Review public content for liability. Monitor data privacy compliance. Manage vendor agreements.',
    description: 'Reviews generated public content for liability, monitors data privacy compliance, and manages vendor agreements.',
    skills: 'contract_summarization,compliance_auditing,privacy_review,vendor_agreements',
    avatarColor: '#0A0A0A',
    tokenBudget: 30000,
    tokenSpend: 11200,
  },
]

const ISSUES = [
  {
    code: 'PAP-39',
    title: 'Q3 Restoration Campaign Launch',
    description: 'Launch the Q3 Restoration Series campaign across Instagram, Journal, and Email. Coordinate with Creative for assets and Legal for copy review.',
    status: 'IN_PROGRESS',
    priority: 'P0',
    type: 'CAMPAIGN',
    assigneeCode: 'CMO',
    createdByCode: 'CEO',
    department: 'MARKETING',
    blocksIds: 'PAP-41',
    blockedByIds: null,
  },
  {
    code: 'PAP-40',
    title: 'Shopify Conversion Rate Drop Investigation',
    description: 'Conversion rate dropped 12% week-over-week. CMO to analyze traffic data, identify funnel leak, propose fix.',
    status: 'IN_REVIEW',
    priority: 'P1',
    type: 'BUG',
    assigneeCode: 'CMO',
    createdByCode: 'CEO',
    department: 'MARKETING',
    blocksIds: null,
    blockedByIds: null,
  },
  {
    code: 'PAP-41',
    title: 'Email Automation Sequence for Restoration Series',
    description: 'Build 5-email automation sequence for Restoration Series launch. Depends on PAP-39 campaign assets.',
    status: 'BACKLOG',
    priority: 'P1',
    type: 'FEATURE',
    assigneeCode: 'CTO',
    createdByCode: 'CMO',
    department: 'TECHNOLOGY',
    blocksIds: null,
    blockedByIds: 'PAP-39',
  },
  {
    code: 'PAP-42',
    title: 'Q3 Budget Reallocation — Marketing → Operations',
    description: 'Operations needs 18% budget increase for Q3 fleece restock. Marketing has 12% underspend. Reallocate.',
    status: 'BLOCKED',
    priority: 'P0',
    type: 'APPROVAL',
    assigneeCode: 'CFO',
    createdByCode: 'COO',
    department: 'FINANCE',
    blocksIds: 'PAP-44',
    blockedByIds: null,
  },
  {
    code: 'PAP-43',
    title: 'Heavyweight Cotton Supplier Audit',
    description: 'Tirupur Cotton Co-op lead time slipped from 21 to 28 days. Audit SLA, identify backup supplier.',
    status: 'IN_PROGRESS',
    priority: 'P2',
    type: 'TASK',
    assigneeCode: 'COO',
    createdByCode: 'COO',
    department: 'OPERATIONS',
    blocksIds: null,
    blockedByIds: null,
  },
  {
    code: 'PAP-44',
    title: 'Q3 Fleece Restock Order — 4,800 units',
    description: 'Place fleece restock order with Ludhiana Fleece Works. Blocked on budget reallocation (PAP-42).',
    status: 'BACKLOG',
    priority: 'P0',
    type: 'TASK',
    assigneeCode: 'COO',
    createdByCode: 'CFO',
    department: 'OPERATIONS',
    blocksIds: null,
    blockedByIds: 'PAP-42',
  },
  {
    code: 'PAP-45',
    title: 'Brand Book Compliance Scan — Q3 Lookbook',
    description: 'Run Brand Guardian AI scan on Q3 Lookbook assets. Flag palette violations, voice drift, forbidden aesthetics.',
    status: 'DONE',
    priority: 'P2',
    type: 'TASK',
    assigneeCode: 'CCO',
    createdByCode: 'CMO',
    department: 'CREATIVE',
    blocksIds: null,
    blockedByIds: null,
  },
  {
    code: 'PAP-46',
    title: 'Founder Note No.8 — On Permanence',
    description: 'Draft Founder Note No.8 on the theme of permanence vs speed. Coordinate with Founder AI for voice consistency.',
    status: 'IN_REVIEW',
    priority: 'P1',
    type: 'TASK',
    assigneeCode: 'CMO',
    createdByCode: 'CEO',
    department: 'MARKETING',
    blocksIds: null,
    blockedByIds: null,
  },
  {
    code: 'PAP-47',
    title: 'Customer Churn Risk — Founder Circle Tier',
    description: '3 Founder Circle members have not ordered in 90 days. CSM to identify root cause and propose retention play.',
    status: 'IN_PROGRESS',
    priority: 'P1',
    type: 'RESEARCH',
    assigneeCode: 'CSM',
    createdByCode: 'CEO',
    department: 'CUSTOMER',
    blocksIds: null,
    blockedByIds: null,
  },
  {
    code: 'PAP-48',
    title: 'Competitive Intel — Indian Streetwear Q3',
    description: 'Research competitor drops, pricing, and messaging in Indian streetwear space for Q3. Compile report for CEO.',
    status: 'BACKLOG',
    priority: 'P2',
    type: 'RESEARCH',
    assigneeCode: 'RESEARCH',
    createdByCode: 'CEO',
    department: 'RESEARCH',
    blocksIds: null,
    blockedByIds: null,
  },
  {
    code: 'PAP-49',
    title: 'Stripe Webhook Retry Logic Hardening',
    description: 'Stripe webhook retries failing silently on edge cases. CTO to add monitoring and retry logic.',
    status: 'IN_PROGRESS',
    priority: 'P0',
    type: 'BUG',
    assigneeCode: 'CTO',
    createdByCode: 'CTO',
    department: 'TECHNOLOGY',
    blocksIds: null,
    blockedByIds: null,
  },
  {
    code: 'PAP-50',
    title: 'Growth Experiment — House Access Waitlist',
    description: 'Launch House Access waitlist experiment. Measure conversion lift from exclusivity framing.',
    status: 'IN_REVIEW',
    priority: 'P2',
    type: 'FEATURE',
    assigneeCode: 'GROWTH',
    createdByCode: 'GROWTH',
    department: 'GROWTH',
    blocksIds: null,
    blockedByIds: null,
  },
]

const EVENTS = [
  { type: 'ISSUE_CREATED', actorCode: 'CEO', summary: 'Created PAP-39: Q3 Restoration Campaign Launch', severity: 'INFO' },
  { type: 'ISSUE_ASSIGNED', actorCode: 'CEO', summary: 'Assigned PAP-39 to Mira (CMO)', severity: 'INFO' },
  { type: 'AGENT_HEARTBEAT', actorCode: 'CMO', summary: 'Mira woke up on routine — daily metrics review', severity: 'INFO' },
  { type: 'AGENT_HEARTBEAT', actorCode: 'CTO', summary: 'Vega woke up on event — Stripe webhook failure detected', severity: 'WARN' },
  { type: 'BUDGET_WARNING', actorCode: 'CFO', summary: 'CMO budget at 68% — 12% underutilized, reallocation opportunity', severity: 'INFO' },
  { type: 'BUDGET_WARNING', actorCode: 'CFO', summary: 'CMO token spend at 68% of budget', severity: 'INFO' },
  { type: 'APPROVAL_REQUESTED', actorCode: 'COO', summary: 'PAP-42: Q3 budget reallocation needs Founder approval', severity: 'WARN' },
  { type: 'ISSUE_CREATED', actorCode: 'COO', summary: 'Created PAP-43: Heavyweight Cotton Supplier Audit', severity: 'INFO' },
  { type: 'AGENT_HEARTBEAT', actorCode: 'CCO', summary: 'Lumen completed brand scan on Q3 Lookbook — PASS', severity: 'INFO' },
  { type: 'ISSUE_DONE', actorCode: 'CCO', summary: 'PAP-45 marked as DONE — 0 violations found', severity: 'INFO' },
  { type: 'CAMPAIGN_LAUNCHED', actorCode: 'CMO', summary: 'Test variant B of House Access waitlist page live', severity: 'INFO' },
  { type: 'AGENT_HEARTBEAT', actorCode: 'CSM', summary: 'Sage detected 3 Founder Circle churn risks', severity: 'WARN' },
  { type: 'ISSUE_BLOCKED', actorCode: 'CFO', summary: 'PAP-42 blocked — awaiting Founder approval', severity: 'CRITICAL' },
  { type: 'AGENT_HEARTBEAT', actorCode: 'CTO', summary: 'Vega deployed hotfix to Stripe webhook retry logic', severity: 'INFO' },
  { type: 'ISSUE_ASSIGNED', actorCode: 'CEO', summary: 'Assigned PAP-48 to Atlas (Research)', severity: 'INFO' },
  { type: 'BUDGET_WARNING', actorCode: 'CFO', summary: 'Growth token spend at 71% — approaching 80% threshold', severity: 'WARN' },
  { type: 'AGENT_HEARTBEAT', actorCode: 'GROWTH', summary: 'Pulse launched House Access waitlist experiment', severity: 'INFO' },
  { type: 'ISSUE_CREATED', actorCode: 'CSM', summary: 'Created PAP-47: Customer churn risk investigation', severity: 'WARN' },
  { type: 'AGENT_HEARTBEAT', actorCode: 'LEGAL', summary: 'Vera reviewed Founder Note No.8 draft — no liability flags', severity: 'INFO' },
  { type: 'ISSUE_IN_REVIEW', actorCode: 'CMO', summary: 'PAP-46 Founder Note draft submitted for Founder review', severity: 'INFO' },
  { type: 'AGENT_HEARTBEAT', actorCode: 'HR', summary: 'Iris monitoring inter-agent comms — alignment nominal', severity: 'INFO' },
  { type: 'ISSUE_ASSIGNED', actorCode: 'CEO', summary: 'Assigned PAP-49 to Vega (CTO)', severity: 'INFO' },
  { type: 'BUDGET_WARNING', actorCode: 'CFO', summary: 'CEO budget at 65% utilization — within bounds', severity: 'INFO' },
  { type: 'AGENT_HEARTBEAT', actorCode: 'RESEARCH', summary: 'Atlas began competitive intel scan on Indian streetwear', severity: 'INFO' },
]

const APPROVALS = [
  {
    code: 'APR-12',
    type: 'BUDGET',
    title: 'Q3 Budget Reallocation — Marketing → Operations',
    description: 'Reallocate ₹4,80,000 from Marketing (underspend) to Operations for Q3 fleece restock. Operations will use funds to place 4,800-unit order with Ludhiana Fleece Works.',
    amount: 480000,
    status: 'PENDING',
    requesterCode: 'CFO',
    issueCode: 'PAP-42',
    inbox: 'MINE',
    isRead: false,
  },
  {
    code: 'APR-11',
    type: 'CAMPAIGN',
    title: 'Restoration Series Campaign — ₹8,50,000 spend',
    description: 'CMO requesting approval for Restoration Series campaign budget. Projected ROAS 3.2x. Channels: Instagram, Journal, Email.',
    amount: 850000,
    status: 'PENDING',
    requesterCode: 'CMO',
    issueCode: 'PAP-39',
    inbox: 'MINE',
    isRead: false,
  },
  {
    code: 'APR-10',
    type: 'HIRING',
    title: 'Hire additional Research Agent for competitive intel',
    description: 'Research Manager overloaded with Q3 competitive intel scope. Propose onboarding a second Research Agent specialized in streetwear.',
    amount: 0,
    status: 'PENDING',
    requesterCode: 'HR',
    issueCode: 'PAP-48',
    inbox: 'MINE',
    isRead: true,
  },
  {
    code: 'APR-09',
    type: 'STRATEGIC',
    title: 'Founder Note No.8 — Publish Approval',
    description: 'CMO drafted Founder Note No.8 on permanence vs speed. Legal reviewed — no liability. Awaiting Founder sign-off to publish.',
    amount: 0,
    status: 'PENDING',
    requesterCode: 'CMO',
    issueCode: 'PAP-46',
    inbox: 'MINE',
    isRead: false,
  },
  {
    code: 'APR-08',
    type: 'VENDOR',
    title: 'New Supplier Onboarding — Kanchipuram Weave Co.',
    description: 'COO proposes onboarding Kanchipuram Weave Co. as backup supplier for Luxe drape fabric. 45-day lead time, 4.6 rating.',
    amount: 0,
    status: 'PENDING',
    requesterCode: 'COO',
    issueCode: 'PAP-43',
    inbox: 'UNREAD',
    isRead: false,
  },
  {
    code: 'APR-07',
    type: 'BUDGET',
    title: 'Growth Experiment Budget Increase',
    description: 'Growth Manager requesting 15% budget increase to scale House Access waitlist experiment. Current variant showing 8.2% conversion lift.',
    amount: 6000,
    status: 'PENDING',
    requesterCode: 'GROWTH',
    issueCode: 'PAP-50',
    inbox: 'UNREAD',
    isRead: false,
  },
  {
    code: 'APR-06',
    type: 'STRATEGIC',
    title: 'Archive Access Tier — Pricing Approval',
    description: 'Propose new Archive Access tier at ₹12,000/year. Targets 200 Founder Circle members. Projected ₹24L annual recurring.',
    amount: 0,
    status: 'REVISION_REQUESTED',
    requesterCode: 'CEO',
    issueCode: null,
    inbox: 'RECENT',
    isRead: true,
    resolvedAt: new Date(Date.now() - 2 * 86400000),
  },
  {
    code: 'APR-05',
    type: 'CAMPAIGN',
    title: 'Agni Red Tee Drop — Approved',
    description: 'Limited drop of 500 Agni Red Heavyweight Tees. Approved and launched.',
    amount: 0,
    status: 'APPROVED',
    requesterCode: 'CMO',
    issueCode: null,
    inbox: 'RECENT',
    isRead: true,
    resolvedAt: new Date(Date.now() - 5 * 86400000),
  },
]

const ISSUE_COMMENTS = [
  { issueCode: 'PAP-39', authorCode: 'CEO', body: 'Mira — please coordinate with Lumen (CCO) on visual direction and Vera (Legal) on copy review. Target launch: 7 days.', kind: 'COMMENT' },
  { issueCode: 'PAP-39', authorCode: 'CMO', body: 'Heartbeat run complete. Analyzed Shopify data — Restoration Series search volume up 34% MoM. Drafting campaign brief now. ROAS projection: 3.2x.', kind: 'HEARTBEAT' },
  { issueCode: 'PAP-39', authorCode: 'CCO', body: 'Visual direction locked. Staying within six-color palette. Agni Red as hero, Noor Black as anchor. 12 assets in production.', kind: 'COMMENT' },
  { issueCode: 'PAP-39', authorCode: 'LEGAL', body: 'Copy reviewed. No liability flags. Approved for publish.', kind: 'COMMENT' },
  { issueCode: 'PAP-40', authorCode: 'CMO', body: 'Investigation complete. Root cause: mobile checkout friction on step 2. Proposed fix: reduce form fields from 7 to 4. Estimated 18% conversion lift.', kind: 'HEARTBEAT' },
  { issueCode: 'PAP-42', authorCode: 'CFO', body: 'Budget reallocation drafted. Marketing has ₹4.8L underspend. Operations needs ₹4.8L for fleece restock. Net-neutral. Awaiting Founder approval.', kind: 'APPROVAL_REQUEST' },
  { issueCode: 'PAP-45', authorCode: 'CCO', body: 'Brand Guardian scan complete. 0 violations. All assets within six-color system. Voice aligned. PASS.', kind: 'HEARTBEAT' },
  { issueCode: 'PAP-46', authorCode: 'CMO', body: 'Draft ready. Theme: permanence vs speed. 480 words. Voice-checked against Founder AI. Submitting for review.', kind: 'COMMENT' },
  { issueCode: 'PAP-49', authorCode: 'CTO', body: 'Hotfix deployed. Added exponential backoff retry logic to Stripe webhook handler. Monitoring for 24h.', kind: 'HEARTBEAT' },
  { issueCode: 'PAP-47', authorCode: 'CSM', body: 'Identified 3 Founder Circle members with 90+ day inactivity. Root cause: no restoration program outreach. Proposing targeted restoration offers.', kind: 'HEARTBEAT' },
]

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function main() {
  console.log('🌱 Seeding EKVAAR OS Digital Workforce...')

  // Clean
  await db.issueComment.deleteMany()
  await db.approval.deleteMany()
  await db.event.deleteMany()
  await db.issue.deleteMany()
  await db.agent.deleteMany()

  // Seed agents
  console.log('→ Seeding 12 digital C-suite agents...')
  const agentMap: Record<string, any> = {}
  for (const a of AGENTS) {
    const status = a.isHuman ? 'ACTIVE' : pick(['ACTIVE', 'IDLE', 'RUNNING', 'ACTIVE', 'IDLE'])
    const agent = await db.agent.create({
      data: {
        code: a.code,
        name: a.name,
        role: a.role,
        status,
        department: a.department,
        primeDirective: a.primeDirective,
        description: a.description,
        skills: a.skills,
        currentTask: status === 'RUNNING' ? pick([
          'Analyzing Shopify conversion data',
          'Drafting campaign brief',
          'Reviewing brand compliance',
          'Monitoring inventory levels',
          'Auditing Q3 expenses',
          'Deploying hotfix',
        ]) : null,
        tokenSpend: a.tokenSpend,
        tokenBudget: a.tokenBudget,
        tasksToday: a.isHuman ? 0 : rand(2, 18),
        tasksTotal: a.isHuman ? 0 : rand(120, 2400),
        successRate: a.isHuman ? 100 : Math.round((rand(920, 999) / 10) * 10) / 10,
        lastHeartbeat: new Date(Date.now() - rand(0, 7200) * 1000),
        avatarColor: a.avatarColor,
        isHuman: a.isHuman,
      },
    })
    agentMap[a.code] = agent
  }

  // Seed issues
  console.log('→ Seeding issues...')
  for (const i of ISSUES) {
    await db.issue.create({
      data: {
        code: i.code,
        title: i.title,
        description: i.description,
        status: i.status,
        priority: i.priority,
        type: i.type,
        assigneeId: i.assigneeCode ? agentMap[i.assigneeCode]?.id : null,
        createdById: i.createdByCode ? agentMap[i.createdByCode]?.id : null,
        department: i.department,
        blocksIds: i.blocksIds,
        blockedByIds: i.blockedByIds,
        createdAt: new Date(Date.now() - rand(0, 14) * 86400000),
      },
    })
  }

  // Seed issue comments
  console.log('→ Seeding issue comments...')
  for (const c of ISSUE_COMMENTS) {
    const issue = await db.issue.findUnique({ where: { code: c.issueCode } })
    if (!issue) continue
    await db.issueComment.create({
      data: {
        issueId: issue.id,
        authorId: c.authorCode ? agentMap[c.authorCode]?.id : null,
        authorName: c.authorCode ? agentMap[c.authorCode]?.name : 'System',
        body: c.body,
        kind: c.kind,
        createdAt: new Date(Date.now() - rand(0, 72) * 3600000),
      },
    })
  }

  // Seed events
  console.log('→ Seeding event bus ledger...')
  for (let i = 0; i < EVENTS.length; i++) {
    const e = EVENTS[i]
    await db.event.create({
      data: {
        type: e.type,
        actorId: e.actorCode ? agentMap[e.actorCode]?.id : null,
        actorName: e.actorCode ? agentMap[e.actorCode]?.name : 'System',
        summary: e.summary,
        payload: JSON.stringify({ source: 'heartbeat_engine', run_id: `run_${rand(1000, 9999)}` }),
        severity: e.severity,
        timestamp: new Date(Date.now() - i * rand(120, 900) * 1000),
      },
    })
  }

  // Seed approvals
  console.log('→ Seeding approval requests...')
  for (const a of APPROVALS) {
    await db.approval.create({
      data: {
        code: a.code,
        type: a.type,
        title: a.title,
        description: a.description,
        amount: a.amount,
        status: a.status,
        requesterId: agentMap[a.requesterCode]?.id,
        issueCode: a.issueCode,
        inbox: a.inbox,
        isRead: a.isRead,
        createdAt: new Date(Date.now() - rand(0, 7) * 86400000),
        resolvedAt: a.resolvedAt || null,
      },
    })
  }

  console.log('✅ EKVAAR OS Digital Workforce seeded successfully.')
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
