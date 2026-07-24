import { db } from "./db";
import { seedIntegrations } from "./composio-service";

import { ROSTER } from './agent-roster'

// Chiefs + specialists live in agent-roster.ts (ROSTER). This is just the human founder.
export const AGENTS = [
  { code: "FOUNDER", name: "Kashinath", role: "Founder & Visionary", department: "EXECUTIVE", primeDirective: "Define the soul and direction of EKVAAR. Every decision must serve permanence.", description: "The human founder and creative force behind EKVAAR.", skills: "vision,strategy,brand,design,culture", avatarColor: "#c084fc", isHuman: true },
];

export const AI_SYSTEMS = [
  { name: "Brand Guardian", status: "ACTIVE", health: 98, tasksToday: 12, tasksTotal: 1450, accuracy: 99.2, description: "Monitors every output for brand alignment — tone, color, philosophy.", pillar: "brand" },
  { name: "Content Engine", status: "ACTIVE", health: 95, tasksToday: 8, tasksTotal: 890, accuracy: 96.5, description: "Generates campaign copy, social posts, and journal entries.", pillar: "content" },
  { name: "Creative AI", status: "ACTIVE", health: 92, tasksToday: 5, tasksTotal: 670, accuracy: 94.0, description: "Visual direction, mood boards, design suggestions.", pillar: "creative" },
  { name: "Commerce Intelligence", status: "ACTIVE", health: 97, tasksToday: 15, tasksTotal: 2100, accuracy: 98.1, description: "Pricing, inventory optimization, demand forecasting.", pillar: "commerce" },
  { name: "Founder Twin", status: "ACTIVE", health: 100, tasksToday: 3, tasksTotal: 420, accuracy: 99.8, description: "Digital representation of the founder's decision-making framework.", pillar: "founder" },
  { name: "Product Intelligence", status: "ACTIVE", health: 94, tasksToday: 7, tasksTotal: 560, accuracy: 95.5, description: "Product performance analysis, trend detection, quality monitoring.", pillar: "product" },
  { name: "Operations AI", status: "ACTIVE", health: 96, tasksToday: 10, tasksTotal: 1800, accuracy: 97.3, description: "Supply chain optimization, logistics, and workflow automation.", pillar: "operations" },
];

// Seeds a fresh user's digital workforce (agents, AI systems, integration catalog) —
// every new account needs its own copy of these, they aren't shared across users.
export async function seedDatabase(userId: string) {
  const results: Record<string, number> = {};

  // Founder (human) — seeded from the base list.
  const founder = AGENTS.find((a: any) => a.isHuman) || AGENTS[0];
  await db.agent.upsert({
    where: { userId_code: { userId, code: founder.code } },
    update: {},
    create: { ...founder, userId, tokenBudget: 50000 },
  });

  // Digital org: Chiefs first (so their ids exist), then specialists linked via managerId.
  const chiefs = ROSTER.filter((a) => a.managerCode === null);
  const specialists = ROSTER.filter((a) => a.managerCode !== null);
  const codeToId: Record<string, string> = {};
  for (const c of chiefs) {
    const a = await db.agent.upsert({
      where: { userId_code: { userId, code: c.code } },
      update: {},
      create: { userId, code: c.code, name: c.name, role: c.role, department: c.department, primeDirective: c.primeDirective, skills: c.skills, avatarColor: c.avatarColor, description: c.role, managerId: null, tokenBudget: 50000 },
    });
    codeToId[c.code] = a.id;
  }
  for (const s of specialists) {
    await db.agent.upsert({
      where: { userId_code: { userId, code: s.code } },
      update: {},
      create: { userId, code: s.code, name: s.name, role: s.role, department: s.department, primeDirective: s.primeDirective, skills: s.skills, avatarColor: s.avatarColor, description: s.role, managerId: s.managerCode ? codeToId[s.managerCode] ?? null : null, tokenBudget: 50000 },
    });
  }
  results.agents = 1 + ROSTER.length;

  const existingAI = await db.aISystem.count({ where: { userId } });
  if (existingAI === 0) {
    for (const system of AI_SYSTEMS) {
      await db.aISystem.create({ data: { ...system, userId } });
    }
    results.aiSystems = AI_SYSTEMS.length;
  }

  const integrationResult = await seedIntegrations(userId);
  results.integrations = typeof integrationResult === 'number' ? integrationResult : (integrationResult as any).seeded || 0;

  return results;
}
