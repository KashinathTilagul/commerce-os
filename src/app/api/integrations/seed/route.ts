import { NextResponse } from 'next/server'
import { seedIntegrations } from '@/lib/composio-service'

// POST /api/integrations/seed — seed the integration catalog
export async function POST() {
  const result = await seedIntegrations()
  return NextResponse.json(result)
}
