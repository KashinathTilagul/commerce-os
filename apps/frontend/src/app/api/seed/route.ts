import { NextRequest } from "next/server";
import { createApiResponse, createApiError } from "@/lib/security";
import { requireRole } from "@/lib/auth-guard";
import { db } from "@/lib/db";
import { seedIntegrations } from "@/lib/composio-service";
import { generateAppInsights } from "@/lib/ai-engine";
import { z } from "zod";

const ZAgents = z.array(z.object({
  code: z.string(),
  name: z.string(),
  role: z.string(),
  department: z.string(),
  primeDirective: z.string(),
  description: z.string(),
  skills: z.string(),
  avatarColor: z.string(),
  isHuman: z.boolean().optional()
}))

const ZAISystems = z.array(z.object({
  name: z.string(),
  status: z.string(),
  health: z.number(),
  tasksToday: z.number(),
  tasksTotal: z.number(),
  accuracy: z.number(),
  description: z.string(),
  pillar: z.string()
}))

async function seedDatabase() {
  const results: Record<string, number> = {};
  
  console.log('[Seed] Generating Core AI Agents...')
  const agents = await generateAppInsights(
    "Generate 10 key executives and digital employees for EKVAAR, a luxury fashion house. Include Kashinath (human founder).", 
    ZAgents, 
    "Return an array of detailed agent objects. Departments like EXECUTIVE, MARKETING, TECHNOLOGY, FINANCE, etc."
  );
  
  for (const agent of agents) {
    await db.agent.upsert({
      where: { code: agent.code },
      update: {},
      create: { ...agent, tokenBudget: 50000 },
    });
  }
  results.agents = agents.length;

  const existingAI = await db.aISystem.count();
  if (existingAI === 0) {
    console.log('[Seed] Generating Core AI Systems...')
    const aiSystems = await generateAppInsights(
      "Generate 6 core AI sub-systems that run the EKVAAR OS.", 
      ZAISystems, 
      "Return an array of AI systems like Brand Guardian, Content Engine, etc. Health should be between 90-100."
    );
    for (const system of aiSystems) {
      await db.aISystem.create({ data: system });
    }
    results.aiSystems = aiSystems.length;
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
