import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const systems = await db.aISystem.findMany({
    where: { userId: auth.user.id },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(systems)
}
