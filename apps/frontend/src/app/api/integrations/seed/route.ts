import { NextResponse } from 'next/server'
import { seedIntegrations } from '@/lib/composio-service'
import { requireAuth } from '@/lib/auth-guard'

// POST /api/integrations/seed — seed the integration catalog for the current user
export async function POST() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const result = await seedIntegrations(auth.user.id)
  return NextResponse.json(result)
}
