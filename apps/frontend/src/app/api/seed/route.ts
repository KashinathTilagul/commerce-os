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

const PRODUCTS = [
  { name: "Noor Black Essential Tee", sku: "SOL-BLK-TEE-001", house: "Solids", color: "Noor Black", category: "tee", price: 1999, cost: 600, stock: 150, material: "220 GSM Heavyweight Cotton", description: "The foundation. Pure black, zero compromise.", imageHue: 0 },
  { name: "Rui White Foundation Tee", sku: "SOL-WHT-TEE-001", house: "Solids", color: "Rui White", category: "tee", price: 1999, cost: 600, stock: 120, material: "220 GSM Heavyweight Cotton", description: "Clean canvas. Built to last.", imageHue: 0 },
  { name: "Agni Red Statement Hoodie", sku: "SOL-RED-HOD-001", house: "Solids", color: "Agni Red", category: "hoodie", price: 3499, cost: 1100, stock: 80, material: "380 GSM French Terry", description: "Fire energy. Bold and unapologetic.", imageHue: 0 },
  { name: "Neel Blue Layer Jacket", sku: "LAY-BLU-JKT-001", house: "Layers", color: "Neel Blue", category: "jacket", price: 4999, cost: 1500, stock: 45, material: "Structured Twill", description: "Deep indigo layering piece for all seasons.", imageHue: 220 },
  { name: "Arav Green Cargo Pants", sku: "STR-GRN-PNT-001", house: "Street", color: "Arav Green", category: "pants", price: 2999, cost: 900, stock: 60, material: "Ripstop Cotton", description: "Utility meets style. Street-ready.", imageHue: 120 },
  { name: "Gulabi Pink Oversized Tee", sku: "SOL-PNK-TEE-001", house: "Solids", color: "Gulabi Pink", category: "tee", price: 2199, cost: 650, stock: 95, material: "220 GSM Heavyweight Cotton", description: "Soft rebellion. Pink with purpose.", imageHue: 330 },
  { name: "Archive Black Bomber", sku: "LUX-BLK-BMB-001", house: "Luxe", color: "Noor Black", category: "jacket", price: 7999, cost: 2500, stock: 25, material: "Premium Satin Shell", description: "Luxury craftsmanship. Limited archive piece.", imageHue: 0 },
  { name: "Origins White Kurta", sku: "ORI-WHT-KUR-001", house: "Origins", color: "Rui White", category: "accessory", price: 3999, cost: 1200, stock: 40, material: "Hand-spun Khadi", description: "Rooted in tradition. Built for tomorrow.", imageHue: 0 },
];

const CUSTOMERS = [
  { name: "Aarav Sharma", email: "aarav@example.com", phone: "+91-9876543210", city: "Mumbai", tier: "FOUNDER_CIRCLE", totalOrders: 12, totalSpent: 45000 },
  { name: "Meera Patel", email: "meera@example.com", phone: "+91-9876543211", city: "Ahmedabad", tier: "ARCHIVE", totalOrders: 8, totalSpent: 28000 },
  { name: "Rohan Gupta", email: "rohan@example.com", phone: "+91-9876543212", city: "Delhi", tier: "HOUSE", totalOrders: 5, totalSpent: 15000 },
  { name: "Priya Singh", email: "priya@example.com", phone: "+91-9876543213", city: "Bangalore", tier: "ORIGINAL", totalOrders: 3, totalSpent: 8000 },
  { name: "Kiran Desai", email: "kiran@example.com", phone: "+91-9876543214", city: "Pune", tier: "ORIGINAL", totalOrders: 2, totalSpent: 5000 },
  { name: "Ananya Joshi", email: "ananya@example.com", phone: "+91-9876543215", city: "Hyderabad", tier: "HOUSE", totalOrders: 6, totalSpent: 22000 },
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

  for (const product of PRODUCTS) {
    await db.product.upsert({
      where: { sku: product.sku },
      update: {},
      create: product,
    });
  }
  results.products = PRODUCTS.length;

  for (const customer of CUSTOMERS) {
    await db.customer.upsert({
      where: { email: customer.email },
      update: {},
      create: customer,
    });
  }
  results.customers = CUSTOMERS.length;

  const existingAI = await db.aISystem.count();
  if (existingAI === 0) {
    for (const system of AI_SYSTEMS) {
      await db.aISystem.create({ data: system });
    }
  }
  results.aiSystems = AI_SYSTEMS.length;

  const integrationCount = await seedIntegrations();
  results.integrations = integrationCount;

  const existingOrders = await db.order.count();
  if (existingOrders === 0) {
    const orders = [
      { orderNumber: "EKV-001", customerName: "Aarav Sharma", customerEmail: "aarav@example.com", customerCity: "Mumbai", channel: "D2C", itemsCount: 3, total: 8497, status: "DELIVERED", paymentStatus: "PAID" },
      { orderNumber: "EKV-002", customerName: "Meera Patel", customerEmail: "meera@example.com", customerCity: "Ahmedabad", channel: "D2C", itemsCount: 2, total: 5498, status: "SHIPPED", paymentStatus: "PAID" },
      { orderNumber: "EKV-003", customerName: "Rohan Gupta", customerEmail: "rohan@example.com", customerCity: "Delhi", channel: "RETAIL", itemsCount: 1, total: 3499, status: "PROCESSING", paymentStatus: "PAID" },
      { orderNumber: "EKV-004", customerName: "Priya Singh", customerEmail: "priya@example.com", customerCity: "Bangalore", channel: "D2C", itemsCount: 2, total: 4198, status: "NEW", paymentStatus: "PENDING" },
      { orderNumber: "EKV-005", customerName: "Kiran Desai", customerEmail: "kiran@example.com", customerCity: "Pune", channel: "WHOLESALE", itemsCount: 10, total: 19990, status: "DELIVERED", paymentStatus: "PAID" },
    ];
    for (const order of orders) {
      await db.order.create({ data: order });
    }
    results.orders = orders.length;
  }

  const existingTx = await db.transaction.count();
  if (existingTx === 0) {
    const transactions = [
      { type: "INCOME", category: "PRODUCT_SALES", amount: 45000, description: "D2C sales — Week 24" },
      { type: "INCOME", category: "WHOLESALE", amount: 19990, description: "Wholesale order — Pune retailer" },
      { type: "EXPENSE", category: "MATERIALS", amount: 12000, description: "Heavyweight cotton fabric — 200m" },
      { type: "EXPENSE", category: "LOGISTICS", amount: 3500, description: "Shipping & handling — June batch" },
      { type: "EXPENSE", category: "AI_INFRA", amount: 2800, description: "LLM API costs — June" },
      { type: "EXPENSE", category: "MARKETING", amount: 5000, description: "Instagram campaign — Summer drop" },
    ];
    for (const tx of transactions) {
      await db.transaction.create({ data: tx });
    }
    results.transactions = transactions.length;
  }

  const existingCampaigns = await db.campaign.count();
  if (existingCampaigns === 0) {
    const campaigns = [
      { title: "Summer Solids Drop", pillar: "product", status: "LIVE", channel: "INSTAGRAM", startDate: new Date("2026-06-01"), budget: 10000, spend: 5200, impressions: 45000, engagement: 4.2 },
      { title: "Founder's Journal Vol. 3", pillar: "founder", status: "LIVE", channel: "JOURNAL", startDate: new Date("2026-06-10"), budget: 0, spend: 0, impressions: 12000, engagement: 8.1 },
      { title: "Origins Collection Teaser", pillar: "culture", status: "SCHEDULED", channel: "ALL", startDate: new Date("2026-07-01"), budget: 15000, spend: 0, impressions: 0, engagement: 0 },
    ];
    for (const campaign of campaigns) {
      await db.campaign.create({ data: campaign });
    }
    results.campaigns = campaigns.length;
  }

  const existingSuppliers = await db.supplier.count();
  if (existingSuppliers === 0) {
    const suppliers = [
      { name: "Shree Textiles", material: "heavyweight cotton", city: "Surat", leadTime: 14, rating: 4.8, status: "ACTIVE" },
      { name: "Krishna Dye Works", material: "dye", city: "Ahmedabad", leadTime: 7, rating: 4.5, status: "ACTIVE" },
      { name: "Bharat Packaging", material: "packaging", city: "Mumbai", leadTime: 5, rating: 4.9, status: "ACTIVE" },
    ];
    for (const supplier of suppliers) {
      await db.supplier.create({ data: supplier });
    }
    results.suppliers = suppliers.length;
  }

  return results;
}

export async function POST(req: NextRequest) {
  const authResult = await requireRole(["ADMIN"])
  if (!authResult.success) return authResult.response

  try {
    const results = await seedDatabase();
    return createApiResponse({ success: true, seeded: results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[API] Seed error:", message);
    return createApiError("Seed operation failed", 500);
  }
}

export async function GET(req: NextRequest) {
  return createApiError("GET method not allowed for seed endpoint. Use POST with admin authentication.", 405);
}
