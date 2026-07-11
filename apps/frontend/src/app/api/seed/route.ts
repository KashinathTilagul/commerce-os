import { NextRequest } from "next/server";
import { createApiResponse, createApiError } from "@/lib/security";
import { requireRole } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { seedIntegrations } from "@/lib/composio-service";

const AGENTS = [
  { code: "FOUNDER", name: "Kashinath", role: "Founder & Visionary", department: "EXECUTIVE", primeDirective: "Define the soul and direction of EKVAAR. Every decision must serve permanence.", description: "The human founder and creative force behind EKVAAR.", skills: "vision,strategy,brand,design,culture", avatarColor: "#c084fc", isHuman: true },
  { code: "CEO", name: "Arjun", role: "Chief Executive Officer", department: "EXECUTIVE", primeDirective: "Execute the founder's vision. Coordinate all departments. Drive growth while preserving brand integrity.", description: "Digital CEO managing day-to-day operations and strategic execution.", skills: "strategy,operations,leadership,analytics,governance", avatarColor: "#f472b6" },
  { code: "CMO", name: "Mira", role: "Chief Marketing Officer", department: "MARKETING", primeDirective: "Build EKVAAR's brand presence. Drive customer acquisition through authentic storytelling.", description: "Digital CMO managing brand, campaigns, and customer engagement.", skills: "marketing,branding,content,social,analytics", avatarColor: "#fb923c" },
  { code: "CTO", name: "Vega", role: "Chief Technology Officer", department: "TECHNOLOGY", primeDirective: "Build and maintain EKVAAR's digital infrastructure. Ship reliable, fast systems.", description: "Digital CTO managing tech stack, deployments, and AI systems.", skills: "engineering,architecture,devops,ai,security", avatarColor: "#38bdf8" },
  { code: "CFO", name: "Dhruv", role: "Chief Financial Officer", department: "FINANCE", primeDirective: "Maintain financial health. Optimize cash flow. Ensure sustainable growth.", description: "Digital CFO managing finances, budgets, and financial strategy.", skills: "finance,accounting,budgeting,forecasting,compliance", avatarColor: "#4ade80" },
  { code: "COO", name: "Kael", role: "Chief Operations Officer", department: "OPERATIONS", primeDirective: "Streamline operations. Optimize supply chain. Ensure quality delivery.", description: "Digital COO managing logistics, suppliers, and production.", skills: "operations,logistics,supply_chain,quality,process", avatarColor: "#a78bfa" },
  { code: "CCO", name: "Zara", role: "Chief Creative Officer", department: "CREATIVE", primeDirective: "Guard EKVAAR's creative identity. Ensure every visual element reflects the brand soul.", description: "Digital CCO managing design, creative direction, and brand aesthetics.", skills: "design,creative,branding,photography,styling", avatarColor: "#f9a8d4" },
  { code: "CSM", name: "Priya", role: "Customer Success Manager", department: "CUSTOMER", primeDirective: "Ensure every customer feels like family. Resolve issues with empathy and speed.", description: "Digital CSM managing customer relationships and support.", skills: "support,communication,empathy,retention,feedback", avatarColor: "#fbbf24" },
  { code: "GROWTH", name: "Rohan", role: "Growth Manager", department: "GROWTH", primeDirective: "Find and execute growth opportunities. Scale revenue channels sustainably.", description: "Digital Growth Manager driving acquisition and revenue optimization.", skills: "growth,analytics,experiments,conversion,partnerships", avatarColor: "#34d399" },
  { code: "RESEARCH", name: "Anaya", role: "Research Manager", department: "RESEARCH", primeDirective: "Stay ahead of trends. Provide market intelligence for strategic decisions.", description: "Digital Research Manager tracking market, competitors, and innovation.", skills: "research,analysis,trends,competitive_intel,innovation", avatarColor: "#818cf8" },
  { code: "HR", name: "Kavya", role: "HR Manager", department: "HR", primeDirective: "Build and nurture the digital workforce. Ensure agent performance and well-being.", description: "Digital HR Manager managing workforce planning and agent development.", skills: "hr,talent,culture,performance,training", avatarColor: "#fb7185" },
  { code: "LEGAL", name: "Aditya", role: "Legal Manager", department: "LEGAL", primeDirective: "Protect EKVAAR legally. Ensure compliance across all operations.", description: "Digital Legal Manager handling compliance, contracts, and governance.", skills: "legal,compliance,contracts,ip,governance", avatarColor: "#94a3b8" },
];

const AI_SYSTEMS = [
  { name: "Brand Guardian", status: "ACTIVE", health: 98, tasksToday: 12, tasksTotal: 1450, accuracy: 99.2, description: "Monitors every output for brand alignment — tone, color, philosophy.", pillar: "brand" },
  { name: "Content Engine", status: "ACTIVE", health: 95, tasksToday: 8, tasksTotal: 890, accuracy: 96.5, description: "Generates campaign copy, social posts, and journal entries.", pillar: "content" },
  { name: "Creative AI", status: "ACTIVE", health: 92, tasksToday: 5, tasksTotal: 670, accuracy: 94.0, description: "Visual direction, mood boards, design suggestions.", pillar: "creative" },
  { name: "Commerce Intelligence", status: "ACTIVE", health: 97, tasksToday: 15, tasksTotal: 2100, accuracy: 98.1, description: "Pricing, inventory optimization, demand forecasting.", pillar: "commerce" },
  { name: "Founder Twin", status: "ACTIVE", health: 100, tasksToday: 3, tasksTotal: 420, accuracy: 99.8, description: "Digital representation of the founder's decision-making framework.", pillar: "founder" },
  { name: "Product Intelligence", status: "ACTIVE", health: 94, tasksToday: 7, tasksTotal: 560, accuracy: 95.5, description: "Product performance analysis, trend detection, quality monitoring.", pillar: "product" },
  { name: "Operations AI", status: "ACTIVE", health: 96, tasksToday: 10, tasksTotal: 1800, accuracy: 97.3, description: "Supply chain optimization, logistics, and workflow automation.", pillar: "operations" },
];

async function seedDatabase() {
  const results: Record<string, number> = {};
  
  for (const agent of AGENTS) {
    await db.agent.upsert({
      where: { code: agent.code },
      update: {},
      create: { ...agent, tokenBudget: 50000 },
    });
  }
  results.agents = AGENTS.length;

  const existingAI = await db.aISystem.count();
  if (existingAI === 0) {
    for (const system of AI_SYSTEMS) {
      await db.aISystem.create({ data: system });
    }
    results.aiSystems = AI_SYSTEMS.length;
  }

  const integrationResult = await seedIntegrations();
  results.integrations = typeof integrationResult === 'number' ? integrationResult : (integrationResult as any).seeded || 0;

  return results;
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole(["ADMIN"])
  if (!authResult.success) return createApiError("Unauthorized", 401)

  try {
    const results = await seedDatabase();
    return createApiResponse({ success: true, seeded: results });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[API] Seed error:", message);
    return createApiError("Seed operation failed: " + message, 500);
  }
}

export async function GET(req: NextRequest) {
  return createApiError("GET method not allowed for seed endpoint. Use POST with admin authentication.", 405);
}
