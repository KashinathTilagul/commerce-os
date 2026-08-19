export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth-guard'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const q = req.nextUrl.searchParams.get('q')?.trim().slice(0, 200)
  const severity = req.nextUrl.searchParams.get('severity')?.trim().toUpperCase()
  const limit = Math.min(Math.max(Number(req.nextUrl.searchParams.get('limit')) || 100, 1), 500)
  const history = await db.event.findMany({
    where: {
      organizationId: auth.organizationId,
      ...(severity && severity !== 'ALL' ? { severity } : {}),
      ...(q ? { OR: [
        { summary: { contains: q, mode: 'insensitive' } },
        { actorName: { contains: q, mode: 'insensitive' } },
        { type: { contains: q, mode: 'insensitive' } },
        { payload: { contains: q, mode: 'insensitive' } },
      ] } : {}),
    },
    orderBy: { timestamp: 'desc' },
    take: limit,
  })
  return NextResponse.json({ events: history })
}

export async function POST(req: NextRequest) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  try {
    const body = await req.json()

    const event = await db.event.create({
      data: {
        ...body,
        organizationId: auth.organizationId,
      },
    })

    return NextResponse.json({ success: true, event })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
