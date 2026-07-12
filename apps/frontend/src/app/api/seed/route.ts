import { NextRequest } from "next/server";
import { createApiResponse, createApiError } from "@/lib/security";
import { requireRole } from "@/lib/auth-guard";
import { seedDatabase } from "@/lib/seed";

export async function POST(req: NextRequest) {
  const authResult = await requireRole(["ADMIN"])
  if (!authResult.success) return createApiError("Unauthorized", 401)

  try {
    const results = await seedDatabase(authResult.user.id);
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
