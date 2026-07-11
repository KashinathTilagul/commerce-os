import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAuth } from '@/lib/auth-guard'

export async function GET() {
  const auth = await requireAuth()
  if (!auth.success) return auth.response

  const restorations = await db.restoration.findMany({
    where: { userId: auth.user.id },
    orderBy: { requestedAt: 'desc' },
  })
  return NextResponse.json(restorations)
}
