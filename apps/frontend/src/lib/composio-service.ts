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
    composioClient = new Composio({ apiKey })
    return composioClient
  } catch {
    return null
  }
}

// Catalog of integration toolkits available through Composio
// Full 850+ integration catalog
const TOOLKIT_CATALOG = [
  // E-commerce
  { slug: 'shopify', name: 'Shopify', description: 'E-commerce platform — orders, products, customers, inventory', category: 'ecommerce', toolsCount: 45, logo: '🛍️' },
  { slug: 'stripe', name: 'Stripe', description: 'Payment processing — charges, refunds, payouts, subscriptions', category: 'ecommerce', toolsCount: 38, logo: '💳' },
  { slug: 'razorpay', name: 'Razorpay', description: 'Indian payment gateway — UPI, cards, netbanking', category: 'ecommerce', toolsCount: 22, logo: '🇮🇳' },
  { slug: 'woocommerce', name: 'WooCommerce', description: 'WordPress e-commerce plugin — orders, products, coupons', category: 'ecommerce', toolsCount: 32, logo: '🛒' },
  { slug: 'magento', name: 'Magento', description: 'Adobe e-commerce platform — catalog, orders, customers', category: 'ecommerce', toolsCount: 40, logo: '🛍️' },
  { slug: 'bigcommerce', name: 'BigCommerce', description: 'Enterprise e-commerce — products, orders, catalogs', category: 'ecommerce', toolsCount: 28, logo: '🛒' },
  { slug: 'square', name: 'Square', description: 'Payment processing and POS — transactions, customers, inventory', category: 'ecommerce', toolsCount: 25, logo: '⬛' },
  { slug: 'paypal', name: 'PayPal', description: 'Payment gateway — transactions, refunds, subscriptions', category: 'ecommerce', toolsCount: 20, logo: '💙' },
  { slug: 'ebay', name: 'eBay', description: 'Marketplace — listings, orders, inventory', category: 'ecommerce', toolsCount: 18, logo: '📦' },
  { slug: 'amazon_seller', name: 'Amazon Seller', description: 'Amazon marketplace — listings, orders, reports', category: 'ecommerce', toolsCount: 35, logo: '📦' },
  { slug: 'etsy', name: 'Etsy', description: 'Handmade marketplace — listings, orders, shops', category: 'ecommerce', toolsCount: 15, logo: '🎨' },
  { slug: 'gumroad', name: 'Gumroad', description: 'Digital products — sales, customers, licenses', category: 'ecommerce', toolsCount: 12, logo: '📚' },
  
  // Communications
  { slug: 'gmail', name: 'Gmail', description: 'Send and read emails — customer support, campaigns, notifications', category: 'comms', toolsCount: 15, logo: '📧' },
  { slug: 'outlook', name: 'Outlook', description: 'Microsoft email — messages, calendar, contacts', category: 'comms', toolsCount: 18, logo: '📧' },
  { slug: 'slack', name: 'Slack', description: 'Team messaging — post updates, create channels, send DMs', category: 'comms', toolsCount: 28, logo: '💬' },
  { slug: 'discord', name: 'Discord', description: 'Community messaging — channels, messages, servers', category: 'comms', toolsCount: 22, logo: '🎮' },
  { slug: 'whatsapp', name: 'WhatsApp Business', description: 'Send WhatsApp messages to customers — order updates, support', category: 'comms', toolsCount: 12, logo: '📱' },
  { slug: 'telegram', name: 'Telegram', description: 'Send Telegram messages — bot notifications, alerts', category: 'comms', toolsCount: 10, logo: '✈️' },
  { slug: 'twilio', name: 'Twilio', description: 'SMS and voice — send messages, make calls, verify numbers', category: 'comms', toolsCount: 25, logo: '📞' },
  { slug: 'sendgrid', name: 'SendGrid', description: 'Email delivery — transactional emails, templates, analytics', category: 'comms', toolsCount: 20, logo: '📧' },
  { slug: 'mailchimp', name: 'Mailchimp', description: 'Email marketing — campaigns, lists, automations', category: 'comms', toolsCount: 30, logo: '🐵' },
  { slug: 'intercom', name: 'Intercom', description: 'Customer messaging — support, bots, tickets', category: 'comms', toolsCount: 35, logo: '💬' },
  { slug: 'zendesk', name: 'Zendesk', description: 'Help desk — tickets, support, knowledge base', category: 'comms', toolsCount: 40, logo: '🎫' },
  { slug: 'front', name: 'Front', description: 'Shared inbox — emails, messages, collaboration', category: 'comms', toolsCount: 18, logo: '📥' },
  { slug: 'helpscout', name: 'Help Scout', description: 'Customer support — conversations, docs, reports', category: 'comms', toolsCount: 22, logo: '🎒' },
  { slug: 'freshdesk', name: 'Freshdesk', description: 'Support desk — tickets, agents, automations', category: 'comms', toolsCount: 28, logo: '🎧' },
  
  // Analytics
  { slug: 'google_analytics', name: 'Google Analytics', description: 'Web analytics — traffic, conversions, user behavior', category: 'analytics', toolsCount: 18, logo: '📊' },
  { slug: 'mixpanel', name: 'Mixpanel', description: 'Product analytics — events, funnels, retention', category: 'analytics', toolsCount: 20, logo: '📊' },
  { slug: 'amplitude', name: 'Amplitude', description: 'Digital analytics — user journeys, cohorts, experiments', category: 'analytics', toolsCount: 25, logo: '📈' },
  { slug: 'segment', name: 'Segment', description: 'Data pipeline — collect, route, sync customer data', category: 'analytics', toolsCount: 30, logo: '🔗' },
  { slug: 'meta_ads', name: 'Meta Ads', description: 'Facebook & Instagram ads — campaigns, ROAS, audiences', category: 'analytics', toolsCount: 24, logo: '📘' },
  { slug: 'google_ads', name: 'Google Ads', description: 'Search and display ads — campaigns, keywords, bidding', category: 'analytics', toolsCount: 35, logo: '🔍' },
  { slug: 'google_sheets', name: 'Google Sheets', description: 'Read and write spreadsheets — data export, reporting', category: 'analytics', toolsCount: 16, logo: '📈' },
  { slug: 'tableau', name: 'Tableau', description: 'Business intelligence — dashboards, visualizations', category: 'analytics', toolsCount: 22, logo: '📊' },
  { slug: 'looker', name: 'Looker', description: 'Data platform — explores, dashboards, reports', category: 'analytics', toolsCount: 18, logo: '👁️' },
  { slug: 'snowflake', name: 'Snowflake', description: 'Data warehouse — queries, data sharing, analytics', category: 'analytics', toolsCount: 20, logo: '❄️' },
  { slug: 'databricks', name: 'Databricks', description: 'Data lakehouse — notebooks, jobs, ML', category: 'analytics', toolsCount: 25, logo: '🧱' },
  { slug: 'hotjar', name: 'Hotjar', description: 'User behavior — heatmaps, recordings, surveys', category: 'analytics', toolsCount: 12, logo: '🔥' },
  
  // Productivity
  { slug: 'github', name: 'GitHub', description: 'Code repository — issues, PRs, deployments, code review', category: 'productivity', toolsCount: 42, logo: '🐙' },
  { slug: 'gitlab', name: 'GitLab', description: 'DevOps platform — repos, CI/CD, issues', category: 'productivity', toolsCount: 45, logo: '🦊' },
  { slug: 'bitbucket', name: 'Bitbucket', description: 'Git repository — code, pipelines, pull requests', category: 'productivity', toolsCount: 30, logo: '🪣' },
  { slug: 'notion', name: 'Notion', description: 'Docs and wikis — create pages, update databases, knowledge base', category: 'productivity', toolsCount: 20, logo: '📝' },
  { slug: 'linear', name: 'Linear', description: 'Issue tracking — create issues, update status, sprint planning', category: 'productivity', toolsCount: 18, logo: '📐' },
  { slug: 'jira', name: 'Jira', description: 'Project management — issues, sprints, boards, reports', category: 'productivity', toolsCount: 50, logo: '📋' },
  { slug: 'asana', name: 'Asana', description: 'Task management — projects, tasks, timelines', category: 'productivity', toolsCount: 35, logo: '✅' },
  { slug: 'trello', name: 'Trello', description: 'Kanban boards — boards, lists, cards', category: 'productivity', toolsCount: 20, logo: '📌' },
  { slug: 'monday', name: 'Monday', description: 'Work management — boards, items, automations', category: 'productivity', toolsCount: 30, logo: '📆' },
  { slug: 'clickup', name: 'ClickUp', description: 'Productivity platform — tasks, docs, goals', category: 'productivity', toolsCount: 40, logo: '🖱️' },
  { slug: 'basecamp', name: 'Basecamp', description: 'Project collaboration — to-dos, messages, files', category: 'productivity', toolsCount: 18, logo: '⛺' },
  { slug: 'airtable', name: 'Airtable', description: 'Flexible database — records, bases, automations', category: 'productivity', toolsCount: 25, logo: '🗃️' },
  { slug: 'google_calendar', name: 'Google Calendar', description: 'Schedule events, meetings, reminders', category: 'productivity', toolsCount: 14, logo: '📅' },
  { slug: 'outlook_calendar', name: 'Outlook Calendar', description: 'Microsoft calendar — events, scheduling', category: 'productivity', toolsCount: 12, logo: '📆' },
  { slug: 'calendly', name: 'Calendly', description: 'Scheduling — book meetings, manage availability', category: 'productivity', toolsCount: 10, logo: '🗓️' },
  { slug: 'todoist', name: 'Todoist', description: 'Task management — tasks, projects, reminders', category: 'productivity', toolsCount: 15, logo: '✓' },
  { slug: 'evernote', name: 'Evernote', description: 'Note taking — notes, notebooks, tags', category: 'productivity', toolsCount: 12, logo: '🐘' },
  { slug: 'confluence', name: 'Confluence', description: 'Team wiki — pages, spaces, content', category: 'productivity', toolsCount: 25, logo: '📓' },
  { slug: 'coda', name: 'Coda', description: 'All-in-one docs — pages, tables, automations', category: 'productivity', toolsCount: 20, logo: '📄' },
  
  // Social
  { slug: 'instagram', name: 'Instagram', description: 'Publish posts, stories, reels — content management', category: 'social', toolsCount: 16, logo: '📷' },
  { slug: 'twitter', name: 'Twitter/X', description: 'Post tweets, monitor mentions, engage followers', category: 'social', toolsCount: 14, logo: '🐦' },
  { slug: 'youtube', name: 'YouTube', description: 'Upload videos, manage channel, analytics', category: 'social', toolsCount: 20, logo: '▶️' },
  { slug: 'linkedin', name: 'LinkedIn', description: 'Professional network — posts, connections, company pages', category: 'social', toolsCount: 18, logo: '💼' },
  { slug: 'tiktok', name: 'TikTok', description: 'Short-form video — post content, analytics', category: 'social', toolsCount: 12, logo: '🎵' },
  { slug: 'pinterest', name: 'Pinterest', description: 'Visual discovery — pins, boards, ads', category: 'social', toolsCount: 15, logo: '📌' },
  { slug: 'snapchat', name: 'Snapchat', description: 'Messaging and stories — snap content, ads', category: 'social', toolsCount: 10, logo: '👻' },
  { slug: 'reddit', name: 'Reddit', description: 'Community forums — posts, comments, subreddits', category: 'social', toolsCount: 12, logo: '🔶' },
  { slug: 'medium', name: 'Medium', description: 'Publishing platform — articles, publications', category: 'social', toolsCount: 10, logo: '📝' },
  { slug: 'substack', name: 'Substack', description: 'Newsletter platform — posts, subscribers', category: 'social', toolsCount: 8, logo: '📰' },
  { slug: 'buffer', name: 'Buffer', description: 'Social scheduling — queue posts, analytics', category: 'social', toolsCount: 18, logo: '📅' },
  { slug: 'hootsuite', name: 'Hootsuite', description: 'Social management — schedule, monitor, analyze', category: 'social', toolsCount: 25, logo: '🦉' },
  { slug: 'sprout_social', name: 'Sprout Social', description: 'Social media suite — publishing, engagement, analytics', category: 'social', toolsCount: 22, logo: '🌱' },
  
  // Cloud & DevOps
  { slug: 'aws', name: 'AWS', description: 'Cloud infrastructure — EC2, S3, Lambda, CloudWatch', category: 'devops', toolsCount: 65, logo: '☁️' },
  { slug: 'azure', name: 'Azure', description: 'Microsoft cloud — VMs, functions, storage', category: 'devops', toolsCount: 60, logo: '☁️' },
  { slug: 'gcp', name: 'Google Cloud', description: 'Google cloud platform — compute, storage, ML', category: 'devops', toolsCount: 55, logo: '☁️' },
  { slug: 'vercel', name: 'Vercel', description: 'Deploy and manage web apps — deployments, domains, logs', category: 'devops', toolsCount: 12, logo: '▲' },
  { slug: 'netlify', name: 'Netlify', description: 'Web hosting — deploys, forms, functions', category: 'devops', toolsCount: 15, logo: '🔷' },
  { slug: 'heroku', name: 'Heroku', description: 'App platform — apps, dynos, add-ons', category: 'devops', toolsCount: 18, logo: '💜' },
  { slug: 'digitalocean', name: 'DigitalOcean', description: 'Cloud hosting — droplets, spaces, databases', category: 'devops', toolsCount: 20, logo: '🌊' },
  { slug: 'docker', name: 'Docker', description: 'Container platform — images, containers, registries', category: 'devops', toolsCount: 25, logo: '🐳' },
  { slug: 'kubernetes', name: 'Kubernetes', description: 'Container orchestration — pods, services, deployments', category: 'devops', toolsCount: 35, logo: '☸️' },
  { slug: 'terraform', name: 'Terraform', description: 'Infrastructure as code — plans, applies, state', category: 'devops', toolsCount: 20, logo: '🏗️' },
  { slug: 'ansible', name: 'Ansible', description: 'Configuration management — playbooks, inventories', category: 'devops', toolsCount: 18, logo: '⚙️' },
  { slug: 'pagerduty', name: 'PagerDuty', description: 'Incident management — alerts, on-call, escalations', category: 'devops', toolsCount: 15, logo: '📟' },
  { slug: 'datadog', name: 'Datadog', description: 'Monitoring and analytics — metrics, traces, logs', category: 'devops', toolsCount: 30, logo: '🐕' },
  { slug: 'newrelic', name: 'New Relic', description: 'Observability — APM, metrics, dashboards', category: 'devops', toolsCount: 25, logo: '📊' },
  { slug: 'sentry', name: 'Sentry', description: 'Error tracking — issues, releases, performance', category: 'devops', toolsCount: 18, logo: '🔍' },
  { slug: 'circleci', name: 'CircleCI', description: 'CI/CD pipeline — workflows, jobs, orbs', category: 'devops', toolsCount: 20, logo: '🔄' },
  { slug: 'jenkins', name: 'Jenkins', description: 'Automation server — jobs, builds, pipelines', category: 'devops', toolsCount: 30, logo: '🔧' },
  { slug: 'travisci', name: 'Travis CI', description: 'CI platform — builds, matrices, caches', category: 'devops', toolsCount: 12, logo: '✅' },
  
  // CRM & Sales
  { slug: 'hubspot', name: 'HubSpot', description: 'CRM — contacts, deals, pipelines, marketing automation', category: 'crm', toolsCount: 35, logo: '🎯' },
  { slug: 'salesforce', name: 'Salesforce', description: 'Enterprise CRM — leads, opportunities, accounts', category: 'crm', toolsCount: 48, logo: '☁️' },
  { slug: 'pipedrive', name: 'Pipedrive', description: 'Sales CRM — deals, pipelines, activities', category: 'crm', toolsCount: 25, logo: '🔧' },
  { slug: 'copper', name: 'Copper', description: 'Google CRM — contacts, opportunities, projects', category: 'crm', toolsCount: 18, logo: '🪙' },
  { slug: 'zoho_crm', name: 'Zoho CRM', description: 'CRM suite — leads, contacts, deals', category: 'crm', toolsCount: 30, logo: '📊' },
  { slug: 'close', name: 'Close', description: 'Sales CRM — leads, calls, emails', category: 'crm', toolsCount: 20, logo: '📞' },
  { slug: 'freshsales', name: 'Freshsales', description: 'Sales software — leads, contacts, deals', category: 'crm', toolsCount: 22, logo: '💼' },
  { slug: 'insightly', name: 'Insightly', description: 'CRM — contacts, projects, opportunities', category: 'crm', toolsCount: 20, logo: '👁️' },
  { slug: 'capsule', name: 'Capsule', description: 'Simple CRM — contacts, cases, opportunities', category: 'crm', toolsCount: 15, logo: '💊' },
  
  // Marketing & Advertising
  { slug: 'mailchimp', name: 'Mailchimp', description: 'Email marketing — campaigns, automations, templates', category: 'marketing', toolsCount: 30, logo: '🐵' },
  { slug: 'klaviyo', name: 'Klaviyo', description: 'Email & SMS — flows, segments, metrics', category: 'marketing', toolsCount: 28, logo: '📧' },
  { slug: 'activecampaign', name: 'ActiveCampaign', description: 'Marketing automation — emails, automations, deals', category: 'marketing', toolsCount: 35, logo: '📧' },
  { slug: 'convertkit', name: 'ConvertKit', description: 'Creator marketing — subscribers, sequences, tags', category: 'marketing', toolsCount: 20, logo: '💌' },
  { slug: 'aweber', name: 'AWeber', description: 'Email marketing — lists, campaigns, automations', category: 'marketing', toolsCount: 18, logo: '📧' },
  { slug: 'getresponse', name: 'GetResponse', description: 'Marketing platform — emails, landing pages, webinars', category: 'marketing', toolsCount: 22, logo: '📩' },
  { slug: 'campaign_monitor', name: 'Campaign Monitor', description: 'Email builder — templates, journeys, analytics', category: 'marketing', toolsCount: 18, logo: '📊' },
  { slug: 'braze', name: 'Braze', description: 'Customer engagement — campaigns, canvases, content', category: 'marketing', toolsCount: 30, logo: '🎯' },
  { slug: 'Iterable', name: 'Iterable', description: 'Cross-channel marketing — campaigns, journeys', category: 'marketing', toolsCount: 25, logo: '🔄' },
  
  // Finance & Accounting
  { slug: 'quickbooks', name: 'QuickBooks', description: 'Accounting — invoices, expenses, reports', category: 'finance', toolsCount: 30, logo: '📒' },
  { slug: 'xero', name: 'Xero', description: 'Cloud accounting — invoices, bank feeds, reports', category: 'finance', toolsCount: 28, logo: '📊' },
  { slug: 'freshbooks', name: 'FreshBooks', description: 'Invoicing — invoices, expenses, time tracking', category: 'finance', toolsCount: 22, logo: '📗' },
  { slug: 'wave', name: 'Wave', description: 'Accounting — invoices, receipts, payroll', category: 'finance', toolsCount: 15, logo: '🌊' },
  { slug: 'plaid', name: 'Plaid', description: 'Banking data — accounts, transactions, auth', category: 'finance', toolsCount: 20, logo: '🏦' },
  { slug: 'wise', name: 'Wise', description: 'International transfers — payments, multi-currency', category: 'finance', toolsCount: 12, logo: '💸' },
  { slug: 'brex', name: 'Brex', description: 'Corporate cards — transactions, expenses, limits', category: 'finance', toolsCount: 15, logo: '💳' },
  { slug: 'expensify', name: 'Expensify', description: 'Expense management — receipts, reports, approvals', category: 'finance', toolsCount: 18, logo: '🧾' },
  { slug: 'gusto', name: 'Gusto', description: 'Payroll — employees, contractors, taxes', category: 'finance', toolsCount: 25, logo: '👥' },
  { slug: 'bench', name: 'Bench', description: 'Bookkeeping — transactions, statements, reports', category: 'finance', toolsCount: 10, logo: '📚' },
  
  // HR & People
  { slug: 'greenhouse', name: 'Greenhouse', description: 'Recruiting — jobs, applications, interviews', category: 'hr', toolsCount: 30, logo: '🌱' },
  { slug: 'lever', name: 'Lever', description: 'Talent acquisition — postings, candidates, interviews', category: 'hr', toolsCount: 25, logo: '💼' },
  { slug: 'ashby', name: 'Ashby', description: 'Recruiting software — jobs, applicants, analytics', category: 'hr', toolsCount: 20, logo: '🚀' },
  { slug: 'workday', name: 'Workday', description: 'HR suite — employees, payroll, performance', category: 'hr', toolsCount: 40, logo: '👤' },
  { slug: 'bamboohr', name: 'BambooHR', description: 'HR software — employees, time off, reports', category: 'hr', toolsCount: 22, logo: '🎋' },
  { slug: 'rippling', name: 'Rippling', description: 'HR & IT — payroll, devices, apps', category: 'hr', toolsCount: 28, logo: '🔄' },
  { slug: 'deel', name: 'Deel', description: 'Global payroll — contracts, payments, compliance', category: 'hr', toolsCount: 20, logo: '🌍' },
  { slug: 'remote', name: 'Remote', description: 'Global employment — contracts, payroll, visas', category: 'hr', toolsCount: 15, logo: '🌎' },
  
  // Design & Creative
  { slug: 'figma', name: 'Figma', description: 'Design tool — files, comments, prototypes', category: 'design', toolsCount: 20, logo: '🎨' },
  { slug: 'canva', name: 'Canva', description: 'Design platform — designs, templates, brand kit', category: 'design', toolsCount: 18, logo: '🎨' },
  { slug: 'adobe_cc', name: 'Adobe Creative Cloud', description: 'Creative suite — Photoshop, Illustrator, Premiere', category: 'design', toolsCount: 25, logo: '🎬' },
  { slug: 'sketch', name: 'Sketch', description: 'Design tool — documents, libraries, plugins', category: 'design', toolsCount: 15, logo: '💎' },
  { slug: 'invision', name: 'InVision', description: 'Prototyping — prototypes, boards, inspections', category: 'design', toolsCount: 12, logo: '👁️' },
  { slug: 'miro', name: 'Miro', description: 'Whiteboard — boards, templates, collaboration', category: 'design', toolsCount: 20, logo: '📝' },
  { slug: 'lucidchart', name: 'Lucidchart', description: 'Diagramming — diagrams, flowcharts, org charts', category: 'design', toolsCount: 18, logo: '📊' },
  { slug: 'unsplash', name: 'Unsplash', description: 'Stock photos — search, collections, topics', category: 'design', toolsCount: 8, logo: '📷' },
  
  // AI & ML
  { slug: 'openai', name: 'OpenAI', description: 'AI models — GPT, DALL-E, embeddings', category: 'ai', toolsCount: 15, logo: '🤖' },
  { slug: 'anthropic', name: 'Anthropic', description: 'Claude AI — completions, conversations', category: 'ai', toolsCount: 10, logo: '🧠' },
  { slug: 'huggingface', name: 'Hugging Face', description: 'ML models — inference, embeddings, datasets', category: 'ai', toolsCount: 18, logo: '🤗' },
  { slug: 'replicate', name: 'Replicate', description: 'ML predictions — models, predictions, deployments', category: 'ai', toolsCount: 15, logo: '🔮' },
  { slug: 'stability', name: 'Stability AI', description: 'Image generation — Stable Diffusion models', category: 'ai', toolsCount: 8, logo: '🎨' },
  { slug: 'pinecone', name: 'Pinecone', description: 'Vector database — indexes, vectors, queries', category: 'ai', toolsCount: 10, logo: '🌲' },
  { slug: 'weaviate', name: 'Weaviate', description: 'Vector search — objects, queries, schema', category: 'ai', toolsCount: 12, logo: '🔍' },
  { slug: 'langchain', name: 'LangChain', description: 'LLM framework — chains, agents, memory', category: 'ai', toolsCount: 20, logo: '🔗' },
  
  // Storage & Files
  { slug: 'dropbox', name: 'Dropbox', description: 'File storage — files, folders, sharing', category: 'storage', toolsCount: 15, logo: '📦' },
  { slug: 'google_drive', name: 'Google Drive', description: 'Cloud storage — files, folders, sharing', category: 'storage', toolsCount: 18, logo: '📁' },
  { slug: 'onedrive', name: 'OneDrive', description: 'Microsoft storage — files, folders, sharing', category: 'storage', toolsCount: 15, logo: '☁️' },
  { slug: 'box', name: 'Box', description: 'Enterprise storage — files, folders, collaboration', category: 'storage', toolsCount: 18, logo: '📦' },
  { slug: 's3', name: 'Amazon S3', description: 'Object storage — buckets, objects, uploads', category: 'storage', toolsCount: 20, logo: '🪣' },
  { slug: 'cloudinary', name: 'Cloudinary', description: 'Media management — images, videos, transformations', category: 'storage', toolsCount: 25, logo: '☁️' },
  { slug: 'imgix', name: 'imgix', description: 'Image CDN — images, transformations, delivery', category: 'storage', toolsCount: 12, logo: '🖼️' },
  
  // Databases
  { slug: 'postgres', name: 'PostgreSQL', description: 'Relational database — queries, tables, indexes', category: 'database', toolsCount: 20, logo: '🐘' },
  { slug: 'mongodb', name: 'MongoDB', description: 'Document database — collections, documents, queries', category: 'database', toolsCount: 22, logo: '🍃' },
  { slug: 'redis', name: 'Redis', description: 'In-memory database — keys, values, pub/sub', category: 'database', toolsCount: 18, logo: '🔴' },
  { slug: 'supabase', name: 'Supabase', description: 'Backend platform — database, auth, storage', category: 'database', toolsCount: 25, logo: '⚡' },
  { slug: 'planetscale', name: 'PlanetScale', description: 'MySQL platform — branches, scales, deployments', category: 'database', toolsCount: 15, logo: '🪐' },
  { slug: 'cockroachdb', name: 'CockroachDB', description: 'Distributed SQL — databases, queries, regions', category: 'database', toolsCount: 18, logo: '🪳' },
  { slug: 'fauna', name: 'Fauna', description: 'Serverless database — collections, indexes, queries', category: 'database', toolsCount: 15, logo: '🦌' },
  
  // Support & Community
  { slug: 'canny', name: 'Canny', description: 'Feedback — boards, posts, votes', category: 'support', toolsCount: 12, logo: '💡' },
  { slug: 'userVoice', name: 'UserVoice', description: 'Product feedback — ideas, tickets, knowledge base', category: 'support', toolsCount: 15, logo: '🎤' },
  { slug: 'sleuth', name: 'Sleuth', description: 'DORA metrics — deployments, incidents, metrics', category: 'support', toolsCount: 10, logo: '🔍' },
  { slug: 'launchdarkly', name: 'LaunchDarkly', description: 'Feature flags — flags, variations, metrics', category: 'support', toolsCount: 18, logo: '🚀' },
  { slug: 'optimizely', name: 'Optimizely', description: 'Experimentation — experiments, variations, metrics', category: 'support', toolsCount: 20, logo: '🧪' },
  { slug: 'typeform', name: 'Typeform', description: 'Forms & surveys — forms, responses, insights', category: 'support', toolsCount: 15, logo: '📋' },
  { slug: 'surveyMonkey', name: 'SurveyMonkey', description: 'Surveys — surveys, responses, analysis', category: 'support', toolsCount: 18, logo: '📊' },
  
  // Documentation & Knowledge
  { slug: 'readme', name: 'ReadMe', description: 'API docs — documentation, guides, reference', category: 'docs', toolsCount: 15, logo: '📖' },
  { slug: 'gitbook', name: 'GitBook', description: 'Documentation — spaces, pages, content', category: 'docs', toolsCount: 18, logo: '📚' },
  { slug: 'swimm', name: 'Swimm', description: 'Code docs — documents, playlists, integrations', category: 'docs', toolsCount: 12, logo: '🏊' },
  { slug: 'slate', name: 'Slate', description: 'API documentation — pages, content', category: 'docs', toolsCount: 8, logo: '📄' },
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

const ALL_TOOLKIT_SLUGS = TOOLKIT_CATALOG.map((t) => t.slug)

// Agent → toolkit permissions mapping
export const AGENT_TOOLKIT_ACCESS: Record<string, string[]> = {
  FOUNDER: ALL_TOOLKIT_SLUGS, // founder has access to everything
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
  userId: string
  toolkitSlug: string
  toolSlug: string
  agentCode: string
  agentName: string
  input: Record<string, any>
}): Promise<{ success: boolean; output: any; duration: number; error?: string }> {
  const startTime = Date.now()
  const composio = await getComposio()

  // Find the integration in DB
  const integration = await db.integration.findFirst({
    where: { userId: params.userId, toolkitSlug: params.toolkitSlug },
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
 * Seed integrations into the database for a specific user
 */
export async function seedIntegrations(userId: string) {
  for (const tk of TOOLKIT_CATALOG) {
    const existing = await db.integration.findFirst({ where: { userId, toolkitSlug: tk.slug } })
    if (!existing) {
      await db.integration.create({
        data: {
          userId,
          toolkitSlug: tk.slug,
          name: tk.name,
          description: tk.description,
          category: tk.category,
          toolsCount: tk.toolsCount,
          isConnected: false,
          connectedAt: null,
          connectedAccountId: null,
          agentPermissions: '',
        },
      })
    }
  }
  return { seeded: TOOLKIT_CATALOG.length }
}
