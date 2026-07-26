import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireOrganization } from '@/lib/auth-guard'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOrganization()
  if (!auth.success) return auth.response

  const { id } = await params
  const resolution = req.nextUrl.searchParams.get('resolution') || ''

  await db.event.create({
    data: {
      organizationId: auth.organizationId,
      type: 'RISK_RESOLVED',
      actorName: 'Founder',
      summary: `Resolved risk ${id}`,
      payload: JSON.stringify({ riskId: id, resolution }),
      severity: 'INFO',
    },
  })

  return NextResponse.json({ status: 'success', risk_id: id })
}
