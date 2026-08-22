export const dynamic = 'force-dynamic'
// side-effect import: starts the scheduled-post publisher interval
import '@/lib/marketing-task-publisher'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const limit = parseInt(searchParams.get('limit') || '50', 10)

  const where: any = { organizationId: auth.organizationId }
  if (status) where.status = status

  const tasks = await db.marketingTask.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return NextResponse.json({ tasks })
}