/**
 * Composio Integration Service
 * Wraps the @composio/core SDK for the EKVAAR OS.
 * Agents call tools autonomously through this service.
 */

import { db } from '@/lib/db'

// Composio SDK — loaded dynamically to avoid SSR issues
let composioClient: any = null

async function getComposio() {
  if (composioClient) return composioClient
  try {
    const { Composio } = await import('@composio/core')
    const apiKey = process.env.COMPOSIO_API_KEY
    if (!apiKey || apiKey.includes('replace_with_real')) {
      return null // No real key — fall back to demo mode
    }
    composioClient = new Composio(apiKey)
    return composioClient
  } catch {
    return null
  }
}

// Catalog of integration toolkits available through Composio
// In production, these are fetched from the Composio API.
// For demo mode, we use a curated subset of the 800+ tools.
const TOOLKIT_CATALOG = [
  // E-commerce
  { slug: 'shopify', name: 'Shopify', description: 'E-commerce platform — orders, products, customers, inventory', category: 'ecommerce', toolsCount: 45, logo: '🛍️' },
  { slug: 'stripe', name: 'Stripe', description: 'Payment processing — charges, refunds, payouts, subscriptions', category: 'ecommerce', toolsCount: 38, logo: '💳' },
  { slug: 'razorpay', name: 'Razorpay', description: 'Indian payment gateway — UPI, cards, netbanking', category: 'ecommerce', toolsCount: 22, logo: '🇮🇳' },
  // Communications
  { slug: 'gmail', name: 'Gmail', description: 'Send and read emails — customer support, campaigns, notifications', category: 'comms', toolsCount: 15, logo: '📧' },
  { slug: 'slack', name: 'Slack', description: 'Team messaging — post updates, create channels, send DMs', category: 'comms', toolsCount: 28, logo: '💬' },
  { slug: 'whatsapp', name: 'WhatsApp Business', description: 'Send WhatsApp messages to customers — order updates, support', category: 'comms', toolsCount: 12, logo: '📱' },
  { slug: 'telegram', name: 'Telegram', description: 'Send Telegram messages — bot notifications, alerts', category: 'comms', toolsCount: 10, logo: '✈️' },
  // Analytics
  { slug: 'google_analytics', name: 'Google Analytics', description: 'Web analytics — traffic, conversions, user behavior', category: 'analytics', toolsCount: 18, logo: '📊' },
  { slug: 'meta_ads', name: 'Meta Ads', description: 'Facebook & Instagram ads — campaigns, ROAS, audiences', category: 'analytics', toolsCount: 24, logo: '📘' },
  { slug: 'google_sheets', name: 'Google Sheets', description: 'Read and write spreadsheets — data export, reporting', category: 'analytics', toolsCount: 16, logo: '📈' },
  // Productivity
  { slug: 'github', name: 'GitHub', description: 'Code repository — issues, PRs, deployments, code review', category: 'productivity', toolsCount: 42, logo: '🐙' },
  { slug: 'notion', name: 'Notion', description: 'Docs and wikis — create pages, update databases, knowledge base', category: 'productivity', toolsCount: 20, logo: '📝' },
  { slug: 'linear', name: 'Linear', description: 'Issue tracking — create issues, update status, sprint planning', category: 'productivity', toolsCount: 18, logo: '📐' },
  { slug: 'google_calendar', name: 'Google Calendar', description: 'Schedule events, meetings, reminders', category: 'productivity', toolsCount: 14, logo: '📅' },
  // Social
  { slug: 'instagram', name: 'Instagram', description: 'Publish posts, stories, reels — content management', category: 'social', toolsCount: 16, logo: '📷' },
  { slug: 'twitter', name: 'Twitter/X', description: 'Post tweets, monitor mentions, engage followers', category: 'social', toolsCount: 14, logo: '🐦' },
  { slug: 'youtube', name: 'YouTube', description: 'Upload videos, manage channel, analytics', category: 'social', toolsCount: 20, logo: '▶️' },
  // Cloud & DevOps
  { slug: 'aws', name: 'AWS', description: 'Cloud infrastructure — EC2, S3, Lambda, CloudWatch', category: 'devops', toolsCount: 65, logo: '☁️' },
  { slug: 'vercel', name: 'Vercel', description: 'Deploy and manage web apps — deployments, domains, logs', category: 'devops', toolsCount: 12, logo: '▲' },
  // CRM
  { slug: 'hubspot', name: 'HubSpot', description: 'CRM — contacts, deals, pipelines, marketing automation', category: 'crm', toolsCount: 35, logo: '🎯' },
  { slug: 'salesforce', name: 'Salesforce', description: 'Enterprise CRM — leads, opportunities, accounts', category: 'crm', toolsCount: 48, logo: '☁️' },
]

// Available tools per toolkit (curated subset for demo)
const TOOLS_BY_TOOLKIT: Record<string, { slug: string; name: string; description: string }[]> = {
  shopify: [
    { slug: 'shopify_get_orders', name: 'Get Orders', description: 'Fetch recent orders with filtering by status, date, customer' },
    { slug: 'shopify_get_products', name: 'Get Products', description: 'List all products with inventory levels and pricing' },
    { slug: 'shopify_create_discount', name: 'Create Discount', description: 'Create a discount code for campaigns' },
    { slug: 'shopify_update_inventory', name: 'Update Inventory', description: 'Adjust stock levels for a product variant' },
    { slug: 'shopify_get_customers', name: 'Get Customers', description: 'Fetch customer list with order history' },
    { slug: 'shopify_fulfill_order', name: 'Fulfill Order', description: 'Mark an order as fulfilled with tracking info' },
  ],
  stripe: [
    { slug: 'stripe_get_charges', name: 'Get Charges', description: 'List recent charges with filtering' },
    { slug: 'stripe_create_refund', name: 'Create Refund', description: 'Refund a charge fully or partially' },
    { slug: 'stripe_get_balance', name: 'Get Balance', description: 'Check available and pending balance' },
    { slug: 'stripe_create_payment_link', name: 'Create Payment Link', description: 'Generate a payment link for a product' },
    { slug: 'stripe_get_payouts', name: 'Get Payouts', description: 'List recent payouts to bank account' },
  ],
  gmail: [
    { slug: 'gmail_send_email', name: 'Send Email', description: 'Send an email to any recipient' },
    { slug: 'gmail_get_emails', name: 'Get Emails', description: 'Fetch emails from inbox with search' },
    { slug: 'gmail_reply_email', name: 'Reply to Email', description: 'Reply to an existing email thread' },
    { slug: 'gmail_create_draft', name: 'Create Draft', description: 'Create a draft email' },
  ],
  slack: [
    { slug: 'slack_send_message', name: 'Send Message', description: 'Post a message to a channel or DM' },
    { slug: 'slack_create_channel', name: 'Create Channel', description: 'Create a new Slack channel' },
    { slug: 'slack_get_channels', name: 'Get Channels', description: 'List all channels in workspace' },
    { slug: 'slack_schedule_message', name: 'Schedule Message', description: 'Schedule a message for later' },
  ],
  github: [
    { slug: 'github_create_issue', name: 'Create Issue', description: 'Create a new issue in a repository' },
    { slug: 'github_create_pr', name: 'Create Pull Request', description: 'Open a PR with changes' },
    { slug: 'github_merge_pr', name: 'Merge Pull Request', description: 'Merge an approved PR' },
    { slug: 'github_get_repo', name: 'Get Repository', description: 'Fetch repo details, stars, issues' },
    { slug: 'github_deploy', name: 'Trigger Deployment', description: 'Trigger a deployment action' },
  ],
  whatsapp: [
    { slug: 'whatsapp_send_message', name: 'Send Message', description: 'Send a WhatsApp message to a customer' },
    { slug: 'whatsapp_send_template', name: 'Send Template', description: 'Send a pre-approved template message' },
  ],
  google_analytics: [
    { slug: 'ga_get_traffic', name: 'Get Traffic', description: 'Fetch website traffic metrics' },
    { slug: 'ga_get_conversions', name: 'Get Conversions', description: 'Fetch conversion data and funnel' },
  ],
  meta_ads: [
    { slug: 'meta_create_campaign', name: 'Create Campaign', description: 'Create a new ad campaign' },
    { slug: 'meta_get_roas', name: 'Get ROAS', description: 'Fetch return on ad spend metrics' },
  ],
  google_sheets: [
    { slug: 'sheets_append_row', name: 'Append Row', description: 'Add a row of data to a spreadsheet' },
    { slug: 'sheets_read_range', name: 'Read Range', description: 'Read data from a spreadsheet range' },
  ],
  notion: [
    { slug: 'notion_create_page', name: 'Create Page', description: 'Create a new page in a database' },
    { slug: 'notion_search', name: 'Search', description: 'Search across all Notion content' },
  ],
  linear: [
    { slug: 'linear_create_issue', name: 'Create Issue', description: 'Create a new issue in Linear' },
    { slug: 'linear_update_issue', name: 'Update Issue', description: 'Update issue status, assignee, priority' },
  ],
  instagram: [
    { slug: 'instagram_post', name: 'Post Content', description: 'Publish a post to Instagram' },
    { slug: 'instagram_get_insights', name: 'Get Insights', description: 'Fetch engagement metrics' },
  ],
  twitter: [
    { slug: 'twitter_post_tweet', name: 'Post Tweet', description: 'Publish a tweet' },
    { slug: 'twitter_get_mentions', name: 'Get Mentions', description: 'Fetch recent mentions' },
  ],
}

// Agent → toolkit permissions mapping
export const AGENT_TOOLKIT_ACCESS: Record<string, string[]> = {
  CMO: ['shopify', 'stripe', 'meta_ads', 'google_analytics', 'instagram', 'twitter'],
  CTO: ['github', 'vercel', 'aws', 'slack'],
  CFO: ['stripe', 'google_sheets', 'shopify'],
  COO: ['shopify', 'google_sheets', 'slack'],
  CCO: ['instagram', 'twitter', 'notion'],
  CSM: ['gmail', 'slack', 'whatsapp', 'hubspot'],
  CEO: ['shopify', 'stripe', 'github', 'slack', 'notion'],
  GROWTH: ['google_analytics', 'meta_ads', 'google_sheets'],
  RESEARCH: ['google_sheets', 'notion'],
}

/**
 * List all available integration toolkits
 */
export async function listToolkits() {
  return TOOLKIT_CATALOG
}

/**
 * Get tools available for a specific toolkit
 */
export function getToolsForToolkit(toolkitSlug: string) {
  return TOOLS_BY_TOOLKIT[toolkitSlug] || []
}

/**
 * Initiate a connection for a specific toolkit (returns an OAuth redirect URL or null for demo mode)
 */
export async function initiateConnection(toolkitSlug: string, entityId?: string): Promise<{ redirectUrl: string | null; error?: string }> {
  const composio = await getComposio()
  
  if (!composio) {
    // Demo mode — no real connection needed
    return { redirectUrl: null }
  }

  try {
    const entity = await composio.getEntity(entityId || 'default')
    const connection = await entity.initiateConnection(toolkitSlug)
    return { redirectUrl: connection.redirectUrl }
  } catch (error: any) {
    return { redirectUrl: null, error: error.message }
  }
}

/**
 * Execute a tool via Composio (or simulate in demo mode)
 */
export async function executeTool(params: {
  toolkitSlug: string
  toolSlug: string
  agentCode: string
  agentName: string
  input: Record<string, any>
}): Promise<{ success: boolean; output: any; duration: number; error?: string }> {
  const startTime = Date.now()
  const composio = await getComposio()

  // Find the integration in DB
  const integration = await db.integration.findUnique({
    where: { toolkitSlug: params.toolkitSlug },
  })

  if (!integration || !integration.isConnected) {
    return {
      success: false,
      output: null,
      duration: Date.now() - startTime,
      error: `Integration ${params.toolkitSlug} is not connected. Connect it first in the Integrations panel.`,
    }
  }

  // Check agent permissions
  const allowedAgents = integration.agentPermissions.split(',').filter(Boolean)
  if (allowedAgents.length > 0 && !allowedAgents.includes(params.agentCode)) {
    return {
      success: false,
      output: null,
      duration: Date.now() - startTime,
      error: `Agent ${params.agentCode} does not have permission to use ${params.toolkitSlug}.`,
    }
  }

  try {
    if (composio) {
      // REAL Composio execution
      const result = await composio.tools.execute({
        toolkit: params.toolkitSlug,
        tool: params.toolSlug,
        input: params.input,
        connectedAccountId: integration.connectedAccountId,
      })
      return {
        success: true,
        output: result,
        duration: Date.now() - startTime,
      }
    } else {
      // DEMO MODE — simulate a successful execution
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 700))
      return {
        success: true,
        output: simulateToolOutput(params.toolSlug, params.input),
        duration: Date.now() - startTime,
      }
    }
  } catch (e: any) {
    return {
      success: false,
      output: null,
      duration: Date.now() - startTime,
      error: e.message || 'Tool execution failed',
    }
  }
}

/**
 * Simulate realistic tool output for demo mode
 */
function simulateToolOutput(toolSlug: string, input: Record<string, any>): any {
  const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

  if (toolSlug.includes('get_orders')) {
    return {
      orders: Array.from({ length: rand(3, 8) }).map((_, i) => ({
        id: `#${rand(100000, 999999)}`,
        customer: ['Aarav Sharma', 'Diya Iyer', 'Kabir Mehta', 'Sara Reddy'][rand(0, 3)],
        total: rand(1499, 24999),
        status: ['PAID', 'FULFILLED', 'PENDING'][rand(0, 2)],
        date: new Date().toISOString(),
      })),
      total: rand(15, 50),
    }
  }
  if (toolSlug.includes('get_products')) {
    return {
      products: ['Heavyweight Tee', 'Premium Fleece Hoodie', 'Founder Cut Jacket', 'Restoration Kit'].map((name) => ({
        name,
        inventory: rand(0, 280),
        price: rand(1499, 24999),
        status: rand(0, 10) > 1 ? 'ACTIVE' : 'RESTOCKING',
      })),
    }
  }
  if (toolSlug.includes('get_balance') || toolSlug.includes('get_charges')) {
    return { available: rand(500000, 5000000), pending: rand(10000, 200000), currency: 'INR' }
  }
  if (toolSlug.includes('send_email') || toolSlug.includes('send_message') || toolSlug.includes('post_tweet')) {
    return { success: true, messageId: `msg_${Date.now()}`, sentAt: new Date().toISOString() }
  }
  if (toolSlug.includes('create_issue') || toolSlug.includes('create_pr')) {
    return { success: true, number: rand(100, 999), url: `https://github.com/ekvaar/os/issues/${rand(100, 999)}` }
  }
  if (toolSlug.includes('get_traffic') || toolSlug.includes('get_roas') || toolSlug.includes('get_conversions')) {
    return { sessions: rand(1000, 50000), conversions: rand(50, 500), conversionRate: (Math.random() * 5).toFixed(2) + '%', roas: (Math.random() * 5).toFixed(2) + 'x' }
  }
  return { success: true, message: 'Tool executed successfully', data: input }
}

/**
 * Seed integrations into the database
 */
export async function seedIntegrations() {
  for (const tk of TOOLKIT_CATALOG) {
    const existing = await db.integration.findUnique({ where: { toolkitSlug: tk.slug } })
    if (!existing) {
      // Auto-connect Shopify and Stripe (demo — in production this requires OAuth)
      const autoConnect = tk.slug === 'shopify' || tk.slug === 'stripe'
      await db.integration.create({
        data: {
          toolkitSlug: tk.slug,
          name: tk.name,
          description: tk.description,
          category: tk.category,
          toolsCount: tk.toolsCount,
          isConnected: autoConnect,
          connectedAt: autoConnect ? new Date() : null,
          connectedAccountId: autoConnect ? `ca_${tk.slug}_${Date.now()}` : null,
          agentPermissions: autoConnect ? Object.entries(AGENT_TOOLKIT_ACCESS)
            .filter(([_, toolkits]) => toolkits.includes(tk.slug))
            .map(([code]) => code)
            .join(',') : '',
        },
      })
    }
  }
  return { seeded: TOOLKIT_CATALOG.length }
}
