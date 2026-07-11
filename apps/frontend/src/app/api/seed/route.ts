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

const ZProducts = z.array(z.object({
  name: z.string(),
  sku: z.string(),
  house: z.string(),
  color: z.string(),
  category: z.string(),
  price: z.number(),
  cost: z.number(),
  stock: z.number(),
  material: z.string(),
  description: z.string(),
  imageHue: z.number()
}))

const ZCustomers = z.array(z.object({
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  city: z.string(),
  tier: z.string(),
  totalOrders: z.number(),
  totalSpent: z.number()
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

const ZOrders = z.array(z.object({
  orderNumber: z.string(),
  customerName: z.string(),
  customerEmail: z.string(),
  customerCity: z.string(),
  channel: z.string(),
  itemsCount: z.number(),
  total: z.number(),
  status: z.string(),
  paymentStatus: z.string()
}))

const ZTransactions = z.array(z.object({
  type: z.string(),
  category: z.string(),
  amount: z.number(),
  description: z.string()
}))

const ZCampaigns = z.array(z.object({
  title: z.string(),
  pillar: z.string(),
  status: z.string(),
  channel: z.string(),
  startDate: z.string(), // Will convert to Date
  budget: z.number(),
  spend: z.number(),
  impressions: z.number(),
  engagement: z.number()
}))

const ZSuppliers = z.array(z.object({
  name: z.string(),
  material: z.string(),
  city: z.string(),
  leadTime: z.number(),
  rating: z.number(),
  status: z.string()
}))

async function seedDatabase() {
  const results: Record<string, number> = {};
  
  // Wipe existing data to replace it fully (or keep if we want to add to it, but user said "remove all dummy data and update")
  // Since we are running the seeder, let's just generate new AI data and insert it.
  
  console.log('[Seed] Generating Agents...')
  const agents = await generateAppInsights(
    "Generate 10 key executives and digital employees for EKVAAR, a luxury fashion house. Include Kashinath (human founder).", 
    ZAgents, 
    "Return an array of detailed agent objects. Departments like EXECUTIVE, MARKETING, TECHNOLOGY, FINANCE, etc."
  );
  
  console.log('[Seed] Generating Products...')
  const products = await generateAppInsights(
    "Generate 8 luxury fashion products for EKVAAR.", 
    ZProducts, 
    "Return an array of products (tees, hoodies, jackets) with high-end descriptions, pricing in INR, and realistic materials."
  );

  console.log('[Seed] Generating Customers...')
  const customers = await generateAppInsights(
    "Generate 6 loyal customers for EKVAAR in India.", 
    ZCustomers, 
    "Return an array of customers. Tiers should be FOUNDER_CIRCLE, ARCHIVE, HOUSE, or ORIGINAL. Spend in INR."
  );

  for (const agent of agents) {
    await db.agent.upsert({
      where: { code: agent.code },
      update: {},
      create: { ...agent, tokenBudget: 50000 },
    });
  }
  results.agents = agents.length;

  for (const product of products) {
    await db.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }
  results.products = products.length;

  for (const customer of customers) {
    await db.customer.upsert({
      where: { email: customer.email },
      update: {},
      create: customer,
    });
  }
  results.customers = customers.length;

  const existingAI = await db.aISystem.count();
  if (existingAI === 0) {
    console.log('[Seed] Generating AI Systems...')
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

  const existingOrders = await db.order.count();
  if (existingOrders === 0) {
    console.log('[Seed] Generating Orders...')
    const orders = await generateAppInsights(
      "Generate 5 recent customer orders.", 
      ZOrders, 
      "Return an array of orders. Statuses: NEW, PROCESSING, SHIPPED, DELIVERED."
    );
    for (const order of orders) {
      await db.order.create({ data: order });
    }
    results.orders = orders.length;
  }

  const existingTx = await db.transaction.count();
  if (existingTx === 0) {
    console.log('[Seed] Generating Transactions...')
    const transactions = await generateAppInsights(
      "Generate 8 recent financial transactions for EKVAAR. Mix of INCOME and EXPENSE.", 
      ZTransactions, 
      "Categories for INCOME: PRODUCT_SALES, WHOLESALE. EXPENSE: MATERIALS, LABOR, LOGISTICS, AI_INFRA, MARKETING. Amount in INR."
    );
    for (const tx of transactions) {
      await db.transaction.create({ data: tx });
    }
    results.transactions = transactions.length;
  }

  const existingCampaigns = await db.campaign.count();
  if (existingCampaigns === 0) {
    console.log('[Seed] Generating Campaigns...')
    const campaigns = await generateAppInsights(
      "Generate 3 marketing campaigns.", 
      ZCampaigns, 
      "Return an array of campaigns. Status: LIVE or SCHEDULED. Dates as ISO strings."
    );
    for (const campaign of campaigns) {
      await db.campaign.create({ data: { ...campaign, startDate: new Date(campaign.startDate) } });
    }
    results.campaigns = campaigns.length;
  }

  const existingSuppliers = await db.supplier.count();
  if (existingSuppliers === 0) {
    console.log('[Seed] Generating Suppliers...')
    const suppliers = await generateAppInsights(
      "Generate 3 Indian suppliers for EKVAAR.", 
      ZSuppliers, 
      "Return an array of suppliers (e.g., textiles, dye, packaging). Rating out of 5."
    );
    for (const supplier of suppliers) {
      await db.supplier.create({ data: supplier });
    }
    results.suppliers = suppliers.length;
  }
  
  const integrationCount = await seedIntegrations();
  results.integrations = integrationCount;

  return results;
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole(["ADMIN"])
  if (!authResult.success) return authResult.response

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
