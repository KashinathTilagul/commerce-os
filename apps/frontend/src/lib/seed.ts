import { db } from "./db";
import { seedIntegrations } from "./composio-service";

import { syncAgentRoster } from './agent-roster-sync'

export const AI_SYSTEMS = [
  { name: "Brand Guardian", status: "IDLE", health: 100, tasksToday: 0, tasksTotal: 0, accuracy: 0, description: "Monitors output for the organization's configured brand rules.", pillar: "brand" },
  { name: "Content Engine", status: "IDLE", health: 100, tasksToday: 0, tasksTotal: 0, accuracy: 0, description: "Supports approved content and campaign workflows.", pillar: "content" },
  { name: "Commerce Intelligence", status: "IDLE", health: 100, tasksToday: 0, tasksTotal: 0, accuracy: 0, description: "Analyzes connected commerce data without inventing activity.", pillar: "commerce" },
  { name: "Operations AI", status: "IDLE", health: 100, tasksToday: 0, tasksTotal: 0, accuracy: 0, description: "Supports operational workflows after real data is connected.", pillar: "operations" },
];

// Seeds a fresh user's digital workforce (agents, AI systems, integration catalog) —
// every new account needs its own copy of these, they aren't shared across users.
export async function seedDatabase(organizationId: string) {
  const results: Record<string, number> = {};

  const organization = await db.organization.findUnique({
    where: { id: organizationId },
    include: { users: { where: { orgRole: 'FOUNDER' }, take: 1 } },
  })
  const founderName = organization?.users[0]?.name || 'Founder'
  const founder = {
    code: 'FOUNDER', name: founderName, role: 'Founder', department: 'EXECUTIVE',
    primeDirective: `Define the direction of ${organization?.name || 'the organization'} using real company context and data.`,
    description: 'The human founder and final decision-maker.', skills: 'vision,strategy,leadership', avatarColor: '#c084fc', isHuman: true,
  }
  await db.agent.upsert({
    where: { organizationId_code: { organizationId, code: founder.code } },
    update: {},
    create: { ...founder, organizationId, tokenBudget: 50000 },
  });

  results.agents = 1 + await syncAgentRoster(db, organizationId);

  const existingAI = await db.aISystem.count({ where: { organizationId } });
  if (existingAI === 0) {
    for (const system of AI_SYSTEMS) {
      await db.aISystem.create({ data: { ...system, organizationId } });
    }
    results.aiSystems = AI_SYSTEMS.length;
  }

  const integrationResult = await seedIntegrations(organizationId);
  results.integrations = typeof integrationResult === 'number' ? integrationResult : (integrationResult as any).seeded || 0;

  // Seed default capabilities for agents
  const cmoAgent = await db.agent.findFirst({ where: { organizationId, code: 'CMO' } })
  if (cmoAgent) {
    const { registerCapabilities } = await import('./capability-registry')
    await registerCapabilities(organizationId, cmoAgent.id, [
      { name: 'meta_ads_optimize', description: 'Audits Meta Ads campaigns, detects creative fatigue, and optimizes spend.', category: 'marketing', requiredPermissions: 'marketing:execute' },
      { name: 'seo_technical_audit', description: 'Runs complete SEO technical audits for website pages and keywords.', category: 'marketing', requiredPermissions: 'web:read' },
      { name: 'geo_ai_search_optimize', description: 'Generative Engine Optimization for ChatGPT, Perplexity, and Claude search visibility.', category: 'marketing', requiredPermissions: 'content:write' },
    ])
  }

  // Seed default skills
  const defaultSkills = [
    { slug: 'seo-audit', name: 'SEO Technical Audit', category: 'seo', source: 'notfair', requiredTools: 'gsc:read', requiredPerms: 'web:read', riskLevel: 'low', skillMdContent: '# SEO Technical Audit\n1. Analyze search console metrics.\n2. Identify low CTR keywords.\n3. Recommend meta title/description changes.' },
    { slug: 'meta-ads-roas-check', name: 'Meta Ads ROAS Optimization', category: 'meta-ads', source: 'notfair', requiredTools: 'meta_ads:read', requiredPerms: 'spend:read', riskLevel: 'medium', skillMdContent: '# Meta Ads ROAS Check\n1. Fetch campaign ROAS.\n2. Flag ad sets under target ROAS.\n3. Propose budget reallocation to founder.' },
    { slug: 'geo-search-check', name: 'Generative Engine Optimization', category: 'geo', source: 'notfair', requiredTools: 'search:read', requiredPerms: 'content:write', riskLevel: 'low', skillMdContent: '# GEO AI Search Check\n1. Search AI query engines for brand mentions.\n2. Audit product citation rates.\n3. Optimize page schema.' },
  ]
  for (const s of defaultSkills) {
    await db.skill.upsert({
      where: { organizationId_slug: { organizationId, slug: s.slug } },
      update: {},
      create: { ...s, organizationId },
    })
  }
  results.skills = defaultSkills.length;

  return results;
}
